import { createClient } from "@/lib/supabase";

export const walletService = {
  /**
   * Récupère les données du portefeuille (balance, transactions, poids total)
   */
  async getWalletData(userId: string) {
    const supabase = createClient();
    
    // Balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Transactions
    const { data: transactions } = await supabase
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
      profile,
      transactions: transactions || [],
      totalWeight
    };
  }
};
