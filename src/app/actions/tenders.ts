"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const { error } = await supabase.from('tenders').insert({
    mairie_id: user.id,
    ...data,
    status: 'open'
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/admin/mairie');
  return { success: true };
}

/**
 * Soumettre une offre (B2B / Organisation)
 */
export async function submitBid(data: {
  tender_id: string;
  bid_amount: number;
  proposal_text: string;
  trucks_count: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const { error } = await supabase.from('tender_bids').insert({
    organisation_id: user.id,
    ...data,
    status: 'pending'
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/admin/organisation');
  return { success: true };
}

/**
 * Attribuer un marché (Mairie)
 */
export async function awardTender(tenderId: string, bidId: string, organisationId: string, zoneId: string) {
  const supabase = await createClient();
  
  // 1. Accepter le bid
  await supabase.from('tender_bids').update({ status: 'accepted' }).eq('id', bidId);
  
  // 2. Refuser les autres
  await supabase.from('tender_bids').update({ status: 'rejected' }).eq('tender_id', tenderId).neq('id', bidId);
  
  // 3. Fermer le tender
  await supabase.from('tenders').update({ status: 'awarded' }).eq('id', tenderId);

  // 4. Créer la concession officielle
  await supabase.from('concessions').insert({
    organisation_id: organisationId,
    zone_id: zoneId,
    status: 'active'
  });

  // 5. Mettre à jour la zone
  await supabase.from('zones').update({ status: 'occupied' }).eq('id', zoneId);

  revalidatePath('/admin/mairie');
  return { success: true };
}
