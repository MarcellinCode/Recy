import { createClient } from "@/lib/supabase";

export const wasteService = {
  /**
   * Récupère les détails d'un lot de déchets
   */
  async getWasteDetails(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wastes')
      .select('*, waste_types(name, emoji, price_per_kg), profiles!seller_id(full_name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Réserve un lot de déchets
   */
  async reserveWaste(id: string, collectorId: string) {
    const supabase = createClient();
    
    // 1. Update status
    const { data, error: reserveError } = await supabase
      .from('wastes')
      .update({
        status: 'reserved',
        collector_id: collectorId
      })
      .eq('id', id)
      .select()
      .single();

    if (reserveError) throw reserveError;

    // 2. Create notifications (logic should ideally be in a DB trigger, but kept here for now as per original code)
    if (data) {
        await supabase.from('notifications').insert([
            {
                profile_id: data.seller_id,
                title: "Lot Réservé !",
                content: `Votre lot a été réservé par un collecteur.`,
                type: 'offer'
            },
            {
                profile_id: collectorId,
                title: "Réservation confirmée",
                content: `Vous avez réservé avec succès ce lot.`,
                type: 'collection'
            }
        ]);
    }

    return data;
  }
};
