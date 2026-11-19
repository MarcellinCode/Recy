"use server";

import { revalidatePath } from "next/cache";
import { requireRole, errorMessage } from "@/lib/auth-guards";

/**
 * Recharge du portefeuille (mode simulation tant qu'aucune API Mobile Money
 * n'est branchée ; plafonnée côté base via platform_settings).
 */
export async function topUpWallet(amount: number) {
    const guard = await requireRole();
    if (!guard.ok) return { success: false, error: guard.error };

    if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, error: "Montant invalide" };
    }

    const { data, error } = await guard.supabase.rpc("fn_adjust_wallet_balance", {
        p_user_id: guard.user.id,
        p_amount: amount,
        p_operation_type: "credit",
    });

    if (error) return { success: false, error: errorMessage(error) };

    revalidatePath("/wallet");
    revalidatePath("/dashboard");
    revalidatePath("/organisation");

    return { success: true, balance: Number(data) };
}
