"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type NotificationType = 'system' | 'alert' | 'success' | 'info';

/**
 * Envoie une notification persistante à un utilisateur
 */
export async function sendNotification(
    profileId: string, 
    title: string, 
    content: string, 
    type: NotificationType = 'info'
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { error } = await supabase
        .from('notifications')
        .insert({
            profile_id: profileId,
            title,
            content,
            type,
            is_read: false
        });

    if (error) {
        console.error("sendNotification error:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}
