"use server";

import { createClient } from "@/lib/supabase-server";
import { requireRole, errorMessage } from "@/lib/auth-guards";

export async function createInvitation(targetEmail?: string) {
    const guard = await requireRole(["super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };

    // Code imprévisible (32 caractères hexadécimaux)
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

    const { data, error } = await guard.supabase.from("system_invitations").insert({
        code,
        role: "mairie",
        target_email: targetEmail?.trim().toLowerCase() || null,
        created_by: guard.user.id,
    }).select().single();

    if (error) return { success: false, error: errorMessage(error) };
    return { success: true, invitation: data };
}

export async function getInvitations() {
    const guard = await requireRole(["super_admin"]);
    if (!guard.ok) return { success: false, invitations: [] };

    const { data, error } = await guard.supabase
        .from("system_invitations")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return { success: false, invitations: [] };
    return { success: true, invitations: data || [] };
}

/**
 * Vérifie un code d'invitation (page d'inscription Mairie, visiteur non connecté).
 * La lecture directe de la table est réservée au Super Admin : on passe par une RPC.
 */
export async function validateInvitation(code: string) {
    if (!code) return { valid: false };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("fn_check_invitation", { p_code: code });
    if (error) return { valid: false };
    return { valid: data === true };
}

/**
 * Conservé pour compatibilité : l'invitation est désormais consommée
 * automatiquement par le trigger d'inscription (côté base), au moment
 * même de la création du compte.
 */
export async function consumeInvitation(_code: string, _userId: string) {
    return true;
}
