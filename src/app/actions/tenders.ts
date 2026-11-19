"use server";

import { revalidatePath } from "next/cache";
import { requireRole, errorMessage } from "@/lib/auth-guards";

/**
 * Créer un nouvel appel d'offres (Mairie)
 */
export async function createTender(data: {
  zone_id: string;
  title: string;
  description: string;
  end_date: string;
  budget_estimate: number;
}) {
  const guard = await requireRole(["mairie", "super_admin"]);
  if (!guard.ok) return { success: false, error: guard.error };
  const { supabase, user, profile } = guard;

  const { data: zone } = await supabase.from("zones").select("organization_id, created_by").eq("id", data.zone_id).single();
  if (profile.role !== "super_admin" && (!zone || (zone.organization_id !== user.id && zone.created_by !== user.id))) {
    return { success: false, error: "Cette zone n'appartient pas à votre territoire." };
  }

  const { error } = await supabase.from("tenders").insert({
    zone_id: data.zone_id,
    title: data.title,
    description: data.description,
    end_date: data.end_date,
    budget_estimate: data.budget_estimate,
    mairie_id: user.id,
    status: "open",
  });
  if (error) return { success: false, error: errorMessage(error) };

  revalidatePath("/city-os");
  revalidatePath("/appels-offres");
  return { success: true };
}

/**
 * Soumettre une offre (Organisation abonnée ou collecteur agréé)
 */
export async function submitBid(data: {
  tender_id: string;
  bid_amount: number;
  proposal_text: string;
  trucks_count: number;
}) {
  const guard = await requireRole(["organisation_admin", "collecteur"]);
  if (!guard.ok) return { success: false, error: guard.error };
  const { supabase, user, profile } = guard;

  if (profile.role === "organisation_admin" && profile.subscription_tier !== "organisation") {
    return { success: false, error: "Abonnement Organisation requis pour soumettre des offres." };
  }
  if (!Number.isFinite(data.bid_amount) || data.bid_amount <= 0) {
    return { success: false, error: "Montant de l'offre invalide." };
  }

  const { data: tender } = await supabase.from("tenders").select("status").eq("id", data.tender_id).single();
  if (!tender || tender.status !== "open") {
    return { success: false, error: "Cet appel d'offres n'est plus ouvert." };
  }

  const { error } = await supabase.from("tender_bids").insert({
    tender_id: data.tender_id,
    bid_amount: data.bid_amount,
    proposal_text: data.proposal_text,
    trucks_count: data.trucks_count,
    organisation_id: user.id,
    status: "pending",
  });
  if (error) return { success: false, error: errorMessage(error) };

  revalidatePath("/organisation");
  revalidatePath("/appels-offres");
  return { success: true };
}

/**
 * Attribuer un marché (Mairie).
 * L'organisation et la zone sont lues EN BASE depuis l'offre et le marché
 * (les paramètres organisationId / zoneId du client ne sont plus pris en compte).
 */
export async function awardTender(tenderId: string, bidId: string, _organisationId?: string, _zoneId?: string) {
  const guard = await requireRole(["mairie", "super_admin"]);
  if (!guard.ok) return { success: false, error: guard.error };
  const { supabase, user, profile } = guard;

  const [{ data: tender }, { data: bid }] = await Promise.all([
    supabase.from("tenders").select("mairie_id, status, zone_id, title").eq("id", tenderId).single(),
    supabase.from("tender_bids").select("id, tender_id, organisation_id").eq("id", bidId).single(),
  ]);

  if (!tender || (profile.role !== "super_admin" && tender.mairie_id !== user.id)) {
    return { success: false, error: "Action non autorisée. Ce marché n'appartient pas à votre juridiction." };
  }
  if (tender.status === "cancelled") return { success: false, error: "Action impossible : ce marché a été annulé." };
  if (tender.status === "awarded") return { success: false, error: "Action impossible : ce marché a déjà été attribué." };
  if (!bid || bid.tender_id !== tenderId) return { success: false, error: "Offre introuvable pour ce marché." };

  try {
    const steps = [
      supabase.from("tender_bids").update({ status: "accepted" }).eq("id", bidId),
      supabase.from("tender_bids").update({ status: "rejected" }).eq("tender_id", tenderId).neq("id", bidId),
      supabase.from("tenders").update({ status: "awarded" }).eq("id", tenderId),
    ];
    for (const step of steps) {
      const { error } = await step;
      if (error) throw error;
    }

    // Une seule concession active par zone
    await supabase.from("concessions").update({ status: "expired" }).eq("zone_id", tender.zone_id).eq("status", "active");

    const rentEnd = new Date();
    rentEnd.setFullYear(rentEnd.getFullYear() + 1);
    const { error: concessionError } = await supabase.from("concessions").insert({
      organization_id: bid.organisation_id,
      zone_id: tender.zone_id,
      rent_end: rentEnd.toISOString(),
      status: "active",
    });
    if (concessionError) throw concessionError;

    await supabase.from("zones").update({ status: "occupied" }).eq("id", tender.zone_id);
  } catch (e) {
    return { success: false, error: errorMessage(e) };
  }

  // Gagnant et perdants sont notifiés (in-app + push) par le trigger tr_bid_events.

  revalidatePath("/city-os");
  revalidatePath("/organisation");
  return { success: true };
}
