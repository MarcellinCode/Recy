"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function dispatchEmergencyAgent(wasteId: string, agentId: string) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch (_) {
                        // Ignored: setting cookies might throw during server-side/static rendering, which is expected.
                    }
                },
            },
        }
    );

    try {
        // Mettre à jour le statut du déchet pour forcer la réservation et marquer comme urgent
        const { error: wasteError } = await supabase
            .from('wastes')
            .update({ 
                status: 'reserved',
                collector_id: agentId,
                is_urgent: true
            })
            .eq('id', wasteId);

        if (wasteError) throw new Error("Erreur lors de l'assignation du déchet: " + wasteError.message);

        // Notifier l'agent
        const { error: notifError } = await supabase
            .from('notifications')
            .insert({
                profile_id: agentId,
                title: '🚨 DÉPLOIEMENT D\'URGENCE',
                content: 'La Mairie a réquisitionné votre véhicule pour un ramassage sanitaire prioritaire immédiat.',
                type: 'system',
                is_read: false
            });

        if (notifError) throw new Error("Erreur lors de l'envoi de la notification: " + notifError.message);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function issueSanction(organizationId: string, type: string, description: string, severity: string = 'medium', penaltyAmount: number = 0) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch (_) {
                        // Ignored: setting cookies might throw during server-side/static rendering, which is expected.
                    }
                },
            },
        }
    );

    try {
        // 🛡️ Guard : empêcher de sanctionner un super_admin
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', organizationId)
            .single();
        if (targetProfile?.role === 'super_admin') {
            return { success: false, error: "Impossible de sanctionner un administrateur système." };
        }

        // Enregistrement dans la table sanctions
        const { error: sanctionError } = await supabase
            .from('sanctions')
            .insert({ 
                organization_id: organizationId, 
                type, 
                description,
                severity,
                penalty_amount: penaltyAmount
            });

        if (sanctionError) throw sanctionError;

        // Débit immédiat du Wallet si un montant est spécifié
        if (penaltyAmount > 0) {
            const { error: penaltyError } = await supabase.rpc('fn_apply_sanction_penalty', {
                p_organization_id: organizationId,
                p_amount: penaltyAmount,
                p_description: `${type} (${severity})`
            });
            if (penaltyError) throw new Error("Erreur débit sanction: " + penaltyError.message);
        }

        // Mise à jour du Score de Performance (baisse proportionnelle à la sévérité)
        const penaltyMap: Record<string, number> = { low: 0.1, medium: 0.25, high: 0.5, critical: 1 };
        const scoreDrop = penaltyMap[severity] || 0.25;

        // Récupérer le score actuel
        const { data: profile } = await supabase.from('profiles').select('performance_score').eq('id', organizationId).single();
        const newScore = Math.max(0, (profile?.performance_score || 5) - scoreDrop);

        await supabase.from('profiles').update({ performance_score: newScore }).eq('id', organizationId);

        // Notifier l'organisation
        const { error: notifError } = await supabase
            .from('notifications')
            .insert({
                profile_id: organizationId,
                title: `⚖️ SANCTION ADMINISTRATIVE`,
                content: `Une amende de ${penaltyAmount} CFA a été appliquée pour : ${description}. Score actuel : ${newScore.toFixed(1)}/5`,
                type: 'alert',
                is_read: false
            });

        if (notifError) throw new Error("Erreur lors de l'envoi de la notification: " + notifError.message);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
