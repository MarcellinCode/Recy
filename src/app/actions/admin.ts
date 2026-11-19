"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getAdminClient, generatePassword, errorMessage, ALL_ROLES, type AppRole } from "@/lib/auth-guards";

/**
 * ACTIONS SUPER ADMIN
 * Chaque action vérifie le rôle super_admin côté serveur, puis passe par
 * une RPC sécurisée (qui revérifie le rôle en base).
 * Les fonctions qui étaient appelées avec try/catch lèvent une erreur en
 * cas d'échec (compatibilité avec l'interface existante).
 */

export async function adjustWallet(userId: string, amount: number, isAddition: boolean) {
    const guard = await requireRole(["super_admin"]);
    if (!guard.ok) throw new Error(guard.error);

    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Montant invalide");

    const { data, error } = await guard.supabase.rpc("fn_admin_adjust_wallet", {
        p_user_id: userId,
        p_amount: isAddition ? amount : -amount,
        p_reason: `Ajustement manuel ${isAddition ? "+" : "-"}${amount}`,
    });
    if (error) throw new Error(errorMessage(error));

    revalidatePath("/admin/users");
    return { success: true, newBalance: Number(data) };
}

export async function updateSystemRole(userId: string, newRole: string) {
    const guard = await requireRole(["super_admin"]);
    if (!guard.ok) throw new Error(guard.error);

    if (!ALL_ROLES.includes(newRole as AppRole)) throw new Error("Rôle invalide");

    // Anti-mutinerie : on ne rétrograde pas un autre Super Admin depuis l'interface
    const { data: target } = await guard.supabase.from("profiles").select("role").eq("id", userId).single();
    if (target?.role === newRole) return { success: true };
    if (target?.role === "super_admin" && newRole !== "super_admin") {
        throw new Error("Action interdite : vous ne pouvez pas rétrograder un autre Super Admin.");
    }

    const { error } = await guard.supabase.rpc("fn_admin_set_role", { p_user_id: userId, p_role: newRole });
    if (error) throw new Error(errorMessage(error));

    revalidatePath("/admin/users");
    return { success: true };
}

export async function setUserStatus(userId: string, status: "Actif" | "Suspendu" | "En attente") {
    const guard = await requireRole(["super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };

    const { error } = await guard.supabase.rpc("fn_admin_set_status", { p_user_id: userId, p_status: status });
    if (error) return { success: false, error: errorMessage(error) };

    // Une suspension coupe aussi la connexion (bannissement Auth)
    const admin = getAdminClient();
    if (admin) {
        await admin.auth.admin.updateUserById(userId, {
            ban_duration: status === "Suspendu" ? "876000h" : "none",
        });
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/organizations");
    return { success: true };
}

/** Met à jour les champs descriptifs (nom, ville) + rôle + statut. */
export async function updateUserProfile(userId: string, data: {
    full_name?: string;
    city?: string;
    role?: string;
    status?: string;
}) {
    const guard = await requireRole(["super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };

    try {
        if (data.role) await updateSystemRole(userId, data.role);

        const { data: current } = await guard.supabase.from("profiles").select("status").eq("id", userId).single();
        if (data.status && data.status !== current?.status) {
            const res = await setUserStatus(userId, data.status as "Actif" | "Suspendu" | "En attente");
            if (!res.success) return res;
        }

        const { error } = await guard.supabase
            .from("profiles")
            .update({ full_name: data.full_name, city: data.city, updated_at: new Date().toISOString() })
            .eq("id", userId);
        if (error) return { success: false, error: errorMessage(error) };
    } catch (e) {
        return { success: false, error: errorMessage(e) };
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/organizations");
    return { success: true };
}

/**
 * Crée un VRAI compte (Auth + profil). L'ancien bouton insérait un profil
 * sans compte d'authentification, ce qui échouait.
 * Retourne le mot de passe provisoire à transmettre à l'utilisateur.
 */
export async function createUserAccount(data: {
    full_name: string;
    email: string;
    role: string;
    city?: string;
    phone?: string;
}) {
    const guard = await requireRole(["super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };

    if (!ALL_ROLES.includes(data.role as AppRole)) return { success: false, error: "Rôle invalide" };
    if (!data.email?.includes("@")) return { success: false, error: "Email invalide" };

    const admin = getAdminClient();
    if (!admin) return { success: false, error: "Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY)." };

    const password = generatePassword();
    const { data: created, error } = await admin.auth.admin.createUser({
        email: data.email.trim().toLowerCase(),
        password,
        email_confirm: true,
        app_metadata: { role: data.role },
        user_metadata: { full_name: data.full_name, city: data.city, phone: data.phone },
    });
    if (error || !created.user) return { success: false, error: errorMessage(error, "Création impossible") };

    await admin.from("profiles").update({
        full_name: data.full_name,
        city: data.city || null,
        role: data.role,
        subscription_tier: data.role === "mairie" ? "mairie" : "starter",
        status: "Actif",
    }).eq("id", created.user.id);

    revalidatePath("/admin/users");
    revalidatePath("/admin/organizations");
    return { success: true, userId: created.user.id, password };
}

/** Supprime le compte Auth (le profil suit par ON DELETE CASCADE). */
export async function deleteUserAccount(userId: string) {
    const guard = await requireRole(["super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };
    if (userId === guard.user.id) return { success: false, error: "Vous ne pouvez pas supprimer votre propre compte." };

    const { data: target } = await guard.supabase.from("profiles").select("role").eq("id", userId).single();
    if (target?.role === "super_admin") return { success: false, error: "Impossible de supprimer un Super Admin." };

    const admin = getAdminClient();
    if (!admin) return { success: false, error: "Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY)." };

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
        // Profil orphelin (sans compte Auth) : on supprime directement le profil
        const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
        if (profileError) return { success: false, error: errorMessage(profileError) };
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/organizations");
    return { success: true };
}
