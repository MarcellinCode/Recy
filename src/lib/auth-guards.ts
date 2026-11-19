// Module réservé au serveur (actions "use server" uniquement).
import { createClient as createSupabaseAdmin, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";

export type AppRole =
    | "producteur"
    | "collecteur"
    | "organisation_admin"
    | "agent_collecteur"
    | "agent_police_verte"
    | "mairie"
    | "super_admin";

export const ALL_ROLES: AppRole[] = [
    "producteur",
    "collecteur",
    "organisation_admin",
    "agent_collecteur",
    "agent_police_verte",
    "mairie",
    "super_admin",
];

export type GuardProfile = {
    id: string;
    role: AppRole;
    status: string | null;
    subscription_tier: string | null;
    city: string | null;
    full_name: string | null;
};

type GuardOk = { ok: true; supabase: SupabaseClient; user: { id: string; email?: string }; profile: GuardProfile };
type GuardKo = { ok: false; error: string };

/**
 * Récupère l'utilisateur connecté et son profil, puis vérifie son rôle.
 * À appeler en tête de CHAQUE action serveur sensible.
 */
export async function requireRole(allowed?: AppRole[]): Promise<GuardOk | GuardKo> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Non authentifié" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, status, subscription_tier, city, full_name")
        .eq("id", user.id)
        .single();

    if (!profile) return { ok: false, error: "Profil introuvable" };
    if (profile.status === "Suspendu") return { ok: false, error: "Compte suspendu" };
    if (allowed && !allowed.includes(profile.role as AppRole)) {
        return { ok: false, error: "Accès refusé pour votre profil" };
    }

    return { ok: true, supabase, user, profile: profile as GuardProfile };
}

/**
 * Client Supabase avec la clé service (contourne la RLS).
 * N'utiliser QU'APRÈS requireRole().
 */
export function getAdminClient(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createSupabaseAdmin(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Mot de passe initial robuste (affiché une seule fois à la personne qui crée le compte). */
export function generatePassword(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const bytes = new Uint8Array(14);
    crypto.getRandomValues(bytes);
    let out = "";
    for (const b of bytes) out += alphabet[b % alphabet.length];
    return `${out.slice(0, 7)}-${out.slice(7)}!`;
}

/** Traduit une erreur Supabase/Postgres en message lisible. */
export function errorMessage(err: unknown, fallback = "Erreur inattendue"): string {
    if (!err) return fallback;
    if (typeof err === "string") return err;
    const anyErr = err as { message?: string };
    return anyErr.message || fallback;
}
