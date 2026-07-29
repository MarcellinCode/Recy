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
    
    // 1. Vérifier le profil du collecteur et son quota
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', collectorId)
      .single();

    if (profileError) throw profileError;

    // Si l'utilisateur est en plan gratuit "free", on vérifie son quota mensuel (3 max)
    if (!profile.subscription_tier || profile.subscription_tier === 'free') {
      const count = await this.getMonthlyReservationCount(collectorId);
      if (count >= 3) {
        throw new Error("Quota atteint : Le plan gratuit limite à 3 réservations par mois. Passez au plan Premium pour des réservations illimitées !");
      }
    }
    
    // 2. Mettre à jour le statut du lot — filtre sur status='published'
    //    pour éviter la race condition (deux collecteurs simultanés)
    const { data, error: reserveError } = await supabase
      .rpc('reserve_waste', { p_waste_id: id, p_collecteur_id: collectorId })
      .single();

    if (reserveError) {
      const msg = reserveError.message || '';
      if (msg.includes('WASTE_ALREADY_RESERVED')) {
        throw new Error("Ce lot vient d'être réservé par quelqu'un d'autre");
      } else if (msg.includes('WASTE_UNAVAILABLE')) {
        throw new Error("Ce lot n'est plus disponible");
      } else if (msg.includes('ROLE_NOT_ALLOWED')) {
        console.error("Rôle non autorisé pour la réservation :", reserveError);
        throw new Error("Action non autorisée : votre rôle ne vous permet pas de réserver un lot.");
      } else if (msg.includes('Non autorisé')) {
        console.error("Accès non autorisé :", reserveError);
        throw new Error("Session expirée ou non autorisée.");
      } else {
        console.error("Supabase reserve RPC error:", reserveError);
        throw new Error(`Erreur lors de la réservation : ${msg}`);
      }
    }

    // 3. Créer les notifications
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
  },

  /**
   * Retourne le nombre de réservations effectuées ce mois-ci par un collecteur
   */
  async getMonthlyReservationCount(collectorId: string): Promise<number> {
    const supabase = createClient();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('wastes')
      .select('*', { count: 'exact', head: true })
      .eq('collector_id', collectorId)
      .gte('created_at', startOfMonth.toISOString()); // Utilise created_at qui existe à 100% dans la structure de base

    if (error) {
      console.error("Error fetching reservation count:", error);
      return 0;
    }
    return count || 0;
  }
};
