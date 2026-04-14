"use server";
 
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { sendNotification } from "./notifications";

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

  // Vérification de l'abonnement
  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
  if (!profile || profile.subscription_tier !== 'mairie') {
    return { success: false, error: "Abonnement Mairie Elite requis pour lancer des appels d'offres." };
  }

  const { error } = await supabase.from('tenders').insert({
    mairie_id: user.id,
    ...data,
    status: 'open'
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/admin/mairie');
  revalidatePath('/appels-offres');
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

  // Vérification de l'abonnement
  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
  if (!profile || (profile.subscription_tier !== 'organisation' && profile.subscription_tier !== 'mairie')) {
    return { success: false, error: "Abonnement Organisation requis pour soumettre des offres." };
  }

  const { error } = await supabase.from('tender_bids').insert({
    organisation_id: user.id,
    ...data,
    status: 'pending'
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/organisation');
  revalidatePath(`/appels-offres/${data.tender_id}`);
  return { success: true };
}

/**
 * Attribuer un marché (Mairie)
 */
export async function awardTender(tenderId: string, bidId: string, organisationId: string, zoneId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  // Vérification de l'abonnement
  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
  if (!profile || profile.subscription_tier !== 'mairie') {
    return { success: false, error: "Action réservée aux Mairies Elite." };
  }
  
  // 1. Accepter le bid
  await supabase.from('tender_bids').update({ status: 'accepted' }).eq('id', bidId);
  
  // 2. Refuser les autres
  await supabase.from('tender_bids').update({ status: 'rejected' }).eq('tender_id', tenderId).neq('id', bidId);
  
  // 3. Fermer le tender
  await supabase.from('tenders').update({ status: 'awarded' }).eq('id', tenderId);
 
  // 4. Créer la concession officielle
  await supabase.from('concessions').insert({
    organization_id: organisationId,
    zone_id: zoneId,
    status: 'active'
  });
 
  // 5. Mettre à jour la zone
  await supabase.from('zones').update({ status: 'occupied' }).eq('id', zoneId);
 
  // 6. Envoyer une notification de victoire
  await sendNotification(
    organisationId,
    "🏆 MARCHÉ ATTRIBUÉ !",
    `Félicitations ! Votre offre pour le marché "${tenderId}" a été retenue par la Mairie. Vous pouvez désormais opérer la zone concernée.`,
    'success'
  );

  revalidatePath('/admin/mairie');
  revalidatePath('/organisation');
  return { success: true };
}
