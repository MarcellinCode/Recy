import { createClient } from "@/lib/supabase";

// ============================================================
// MODE SIMULATION — pas d'API de paiement pour l'instant
// Toutes les opérations tentent Supabase, puis fallback local
// ============================================================

const SIMULATION_TRANSACTIONS = [
  { id: 'sim_1', type: 'income', amount: 3500, description: 'Vente Plastique PET (12 kg)', created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: 'sim_2', type: 'outcome', amount: 2000, description: 'Abonnement Foyer (Mensuel)', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'sim_3', type: 'income', amount: 7200, description: 'Vente Métaux Ferreux (8 kg)', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'sim_4', type: 'income', amount: 1800, description: 'Vente Carton Mixte (15 kg)', created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: 'sim_5', type: 'outcome', amount: 500, description: 'Frais de service RecyCla', created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
];

export const walletService = {
  /**
   * Récupère les données du portefeuille (balance, transactions, poids total)
   * Fallback simulation si Supabase échoue
   */
  async getWalletData(userId: string) {
    const supabase = createClient();
    
    // Balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Transactions — essayer Supabase, sinon simulation
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });

    // Total Weight
    const { data: weightData } = await supabase
      .from('wastes')
      .select('final_weight')
      .eq('seller_id', userId)
      .eq('status', 'collected');
    
    const totalWeight = weightData?.reduce((acc: any, curr: any) => acc + (Number(curr.final_weight) || 0), 0) || 0;

    return {
      profile: profile || { wallet_balance: 12500, eco_points: 340 },
      transactions: (transactions && transactions.length > 0) ? transactions : SIMULATION_TRANSACTIONS,
      totalWeight: totalWeight || 35.5
    };
  },

  /**
   * SIMULATION — Recharge portefeuille (Top-up)
   * En production : sera remplacé par l'API Wave/Orange Money
   */
  async creditWallet(userId: string, amount: number): Promise<{ success: boolean; balance?: number; error?: string }> {
    const supabase = createClient();
    
    try {
      // Tenter Supabase
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();

      const currentBalance = profile?.wallet_balance || 0;
      const newBalance = currentBalance + amount;

      // Enregistrer la transaction
      await supabase.from('transactions').insert({
        profile_id: userId,
        type: 'income',
        amount,
        description: `Recharge Portefeuille (Simulation)`
      });

      // Mettre à jour le solde
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);

      if (error) throw error;
      return { success: true, balance: newBalance };
    } catch (err: any) {
      // Fallback simulation — on simule le succès
      console.warn('[SIMULATION] creditWallet fallback:', err?.message);
      return { success: true, balance: amount };
    }
  },

  /**
   * SIMULATION — Débit portefeuille (Abonnement/Service)
   * En production : sera remplacé par l'API Wave/Orange Money
   */
  async debitWallet(userId: string, amount: number): Promise<{ success: boolean; balance?: number; error?: string }> {
    const supabase = createClient();
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();

      const currentBalance = profile?.wallet_balance || 0;
      if (currentBalance < amount) {
        return { success: false, error: 'Solde insuffisant' };
      }

      const newBalance = currentBalance - amount;

      await supabase.from('transactions').insert({
        profile_id: userId,
        type: 'outcome',
        amount: -amount,
        description: `Paiement Service (Simulation)`
      });

      const { error } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);

      if (error) throw error;
      return { success: true, balance: newBalance };
    } catch (err: any) {
      console.warn('[SIMULATION] debitWallet fallback:', err?.message);
      return { success: true, balance: 0 };
    }
  },

  /**
   * SIMULATION — Retrait vers Mobile Money
   */
  async withdraw(userId: string, amount: number, phone: string): Promise<{ success: boolean; error?: string }> {
    // Simule un délai de traitement réseau
    await new Promise(r => setTimeout(r, 1500));
    console.log(`[SIMULATION] Retrait de ${amount} CFA vers ${phone} pour l'utilisateur ${userId}`);
    return { success: true };
  }
};
