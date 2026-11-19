import { createClient } from "@/lib/supabase";

// ============================================================
// Portefeuille — toutes les écritures passent par des RPC
// sécurisées (identiques au mobile). Plus de faux « succès »
// en cas d'erreur : l'utilisateur voit le vrai message.
// ============================================================

function readError(err: unknown, fallback: string) {
  const msg = (err as { message?: string })?.message;
  return msg || fallback;
}

export const walletService = {
  /**
   * Récupère les données du portefeuille (balance, transactions, poids total)
   */
  async getWalletData(userId: string) {
    const supabase = createClient();

    const [
      { data: profile },
      { data: transactions },
      { data: weightData },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, wallet_balance, eco_points, full_name, role')
        .eq('id', userId)
        .single(),
      supabase
        .from('transactions')
        .select('id, user_id, type, amount, description, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('wastes')
        .select('final_weight')
        .eq('seller_id', userId)
        .eq('status', 'collected'),
    ]);

    const totalWeight = weightData?.reduce((acc: number, curr: { final_weight: number | null }) => acc + (Number(curr.final_weight) || 0), 0) || 0;

    return {
      profile: profile || { wallet_balance: 0, eco_points: 0 },
      transactions: transactions || [],
      totalWeight
    };
  },

  /**
   * Recharge (mode simulation, plafonnée côté base)
   */
  async creditWallet(userId: string, amount: number): Promise<{ success: boolean; balance?: number; error?: string }> {
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Montant invalide' };
    const supabase = createClient();
    const { data, error } = await supabase.rpc('fn_adjust_wallet_balance', {
      p_user_id: userId,
      p_amount: amount,
      p_operation_type: 'credit',
    });
    if (error) return { success: false, error: readError(error, 'Recharge impossible') };
    return { success: true, balance: Number(data) };
  },

  /**
   * Débit pour un service
   */
  async debitWallet(userId: string, amount: number): Promise<{ success: boolean; balance?: number; error?: string }> {
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Montant invalide' };
    const supabase = createClient();
    const { data, error } = await supabase.rpc('fn_adjust_wallet_balance', {
      p_user_id: userId,
      p_amount: -amount,
      p_operation_type: 'debit',
    });
    if (error) return { success: false, error: readError(error, 'Débit impossible') };
    return { success: true, balance: Number(data) };
  },

  /**
   * Demande de retrait Mobile Money : le montant est bloqué (débité) et la
   * demande apparaît « En attente » dans l'espace Finance du Super Admin.
   */
  async withdraw(_userId: string, amount: number, phone: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('fn_request_withdrawal', {
      p_amount: amount,
      p_phone: phone,
    });
    if (error) return { success: false, error: readError(error, 'Demande de retrait impossible') };
    return { success: true, balance: Number(data) };
  }
};
