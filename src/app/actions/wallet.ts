"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/**
 * Recharge simulée du Wallet (Top-up)
 */
export async function topUpWallet(amount: number) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  // 1. Récupérer le solde actuel
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', user.id)
    .single();

  const newBalance = (profile?.wallet_balance || 0) + amount;

  // 2. Mettre à jour le solde
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ wallet_balance: newBalance })
    .eq('id', user.id);

  if (updateError) return { success: false, error: updateError.message };

  // 3. Enregistrer la transaction
  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: amount,
    type: 'income',
    description: `Recharge simulation (+${amount} CFA)`
  });

  revalidatePath('/wallet');
  revalidatePath('/dashboard');
  
  return { success: true, balance: newBalance };
}
