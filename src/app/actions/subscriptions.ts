"use server";

import { revalidatePath } from "next/cache";
import { requireRole, errorMessage } from "@/lib/auth-guards";

/**
 * Souscription à un plan plateforme (SaaS).
 * Le prix et le palier autorisé pour chaque rôle sont définis CÔTÉ BASE
 * (fn_subscribe_platform) : le client ne peut ni choisir son prix ni
 * s'attribuer un palier d'un autre profil.
 */
export async function subscribeToPlatform(tier: string) {
    const guard = await requireRole();
    if (!guard.ok) return { success: false, error: guard.error };

    const { data, error } = await guard.supabase.rpc("fn_subscribe_platform", { p_tier: tier });
    if (error) return { success: false, error: errorMessage(error) };

    revalidatePath("/abonnements");
    revalidatePath("/organisation");
    revalidatePath("/city-os");
    revalidatePath("/wallet");
    revalidatePath("/dashboard");

    return { success: true, balance: Number(data?.balance) || 0, tier: data?.tier as string | undefined };
}

/**
 * Note : la validation des quotas de réservation est faite dans la RPC
 * reserve_waste (côté base).
 */
