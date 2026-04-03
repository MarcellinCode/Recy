"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function dispatchEmergencyAgent(wasteId: string, agentId: string) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
                    } catch (_) {}
                },
            },
        }
    );

    try {
        // Mettre à jour le statut du déchet pour forcer la réservation
        const { error: wasteError } = await supabase
            .from('wastes')
            .update({ 
                status: 'reserved',
                collector_id: agentId 
            })
            .eq('id', wasteId);

        if (wasteError) throw new Error("Erreur lors de l'assignation du déchet: " + wasteError.message);

        // Notifier l'agent
        const { error: notifError } = await supabase
            .from('notifications')
            .insert({
                profile_id: agentId,
                title: '🚨 DÉPLOIEMENT D\'URGENCE',
                content: 'La Mairie a réquisitionné votre véhicule pour un ramassage sanitaire prioritaire immédiat. Veuillez vous rendre au point critique !',
                type: 'system',
                is_read: false
            });

        if (notifError) throw new Error("Erreur lors de l'envoi de la notification: " + notifError.message);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
