"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function confirmCollection(wasteId: string, finalWeight: number) {
    const supabase = await createClient();

    try {
        // 1. Récupérer les détails du lot
        const { data: waste, error: wasteError } = await supabase
            .from('wastes')
            .select('*, waste_types(*)')
            .eq('id', wasteId)
            .single();

        if (wasteError || !waste) throw new Error("Lot introuvable.");

        // 2. Vérifier l'utilisateur
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== waste.collector_id) throw new Error("Non autorisé. Seul le collecteur assigné peut confirmer.");

        if (waste.status !== 'reserved') {
            throw new Error("Ce lot ne peut pas être collecté car son statut est : " + waste.status);
        }

        const pricePerKg = waste.waste_types.price_per_kg;
        const totalAmount = Number(finalWeight) * Number(pricePerKg);
        const commission = totalAmount * 0.10;
        const sellerAmount = totalAmount - commission;

        // 3. Mise à jour du lot
        const { error: updateError } = await supabase
            .from('wastes')
            .update({
                status: 'collected',
                final_weight: finalWeight
            })
            .eq('id', wasteId);

        if (updateError) throw updateError;

        // 4. Mise à jour des Wallets (Simulation)
        const { data: sellerProfile } = await supabase.from('profiles').select('wallet_balance, eco_points').eq('id', waste.seller_id).single();
        const { data: collectorProfile } = await supabase.from('profiles').select('wallet_balance').eq('id', waste.collector_id).single();

        if (sellerProfile && collectorProfile) {
            // Crédit vendeur + Points Éco
            const ecoPointsEarned = Math.round(finalWeight);
            await supabase.from('profiles').update({
                wallet_balance: Number(sellerProfile.wallet_balance) + sellerAmount,
                eco_points: (sellerProfile.eco_points || 0) + ecoPointsEarned
            }).eq('id', waste.seller_id);

            // Débit collecteur
            await supabase.from('profiles').update({
                wallet_balance: Number(collectorProfile.wallet_balance) - totalAmount
            }).eq('id', waste.collector_id);
        }

        // 5. Enregistrement des transactions
        await supabase.from('transactions').insert([
            {
                profile_id: waste.seller_id,
                amount: sellerAmount,
                type: 'income',
                description: `Vente de ${finalWeight}kg de ${waste.waste_types.name}`
            },
            {
                profile_id: waste.collector_id,
                amount: -totalAmount,
                type: 'outcome',
                description: `Achat de ${finalWeight}kg de ${waste.waste_types.name}`
            }
        ]);

        // 6. Envoi des Notifications
        await supabase.from('notifications').insert([
            {
                profile_id: waste.seller_id,
                title: "Paiement Reçu !",
                content: `Votre vente de ${waste.waste_types.name} est validée. +${sellerAmount} FCFA.`,
                type: 'payment'
            },
            {
                profile_id: waste.collector_id,
                title: "Collecte Terminée",
                content: `Vous avez finalisé la collecte de ${finalWeight}kg de ${waste.waste_types.name}.`,
                type: 'collection'
            }
        ]);

        revalidatePath(`/mes-dechets/${wasteId}`);
        revalidatePath(`/wallet`);

        return { success: true };
    } catch (err: any) {
        console.error("Erreur confirmCollection:", err);
        return { success: false, error: err.message };
    }
}
