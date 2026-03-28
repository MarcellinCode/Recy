"use server";
 
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/**
 * ACTIONS POUR LES ABONNEMENTS (SaaS & Operational)
 * Centralise tous les paiements d'abonnement de la plateforme.
 */

export async function subscribeToPlatform(tier: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non connecté" };

    const prices: Record<string, number> = {
        'organisation_standard': 20000,
        'mairie_elite': 200000,
        'collector_premium': 5000,
        'household': 2000,
        'business_local': 6000,
        'industry': 15000
    };

    const amount = prices[tier];
    if (amount === undefined) {
        // Fallback for tiers without underscore if needed, or just strict check
        return { success: false, error: "Plan invalide ou non tarifé." };
    }

    // 1. Vérifier le solde du Wallet
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) return { success: false, error: "Profil introuvable" };
    
    if (Number(profile.wallet_balance) < amount) {
        return { success: false, error: `Solde insuffisant. Votre solde est de ${profile.wallet_balance} FCFA, mais ce plan coûte ${amount} FCFA.` };
    }

    // 2. Créer l'abonnement plateforme (Log historique)
    const { error: subError } = await supabase
        .from('platform_subscriptions')
        .insert([{
            profile_id: user.id,
            tier,
            price_paid: amount,
            status: 'active',
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }]);

    if (subError) return { success: false, error: subError.message };

    // 3. Débiter le portefeuille & Mettre à jour le Tier dans le profil
    // Le tier stocké dans profiles est souvent le préfixe (ex: 'organisation', 'mairie', 'collector')
    // mais pour les citoyens on stocke le type exact ou 'citizen'.
    const baseTier = tier.split('_')[0]; 
    
    const { error: walletError } = await supabase
        .from('profiles')
        .update({ 
            wallet_balance: Number(profile.wallet_balance) - amount, 
            subscription_tier: baseTier 
        })
        .eq('id', user.id);

    if (walletError) return { success: false, error: walletError.message };

    // 4. Enregistrer la transaction
    await supabase.from('transactions').insert([{
        profile_id: user.id,
        amount: -amount,
        type: 'outcome',
        description: `Souscription Plan : ${tier.toUpperCase()}`
    }]);

    // 5. Revalidation des pages impactées
    revalidatePath('/abonnements');
    revalidatePath('/organisation');
    revalidatePath('/admin/mairie');
    revalidatePath('/wallet');

    return { success: true };
}

/**
 * Note: La validation des quotas de réservation est maintenant gérée 
 * directement dans wasteService.ts lors de l'appel à reserveWaste.
 */
