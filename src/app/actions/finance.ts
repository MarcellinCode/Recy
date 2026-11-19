"use server";

import { revalidatePath } from "next/cache";
import { requireRole, errorMessage } from "@/lib/auth-guards";

/** Super Admin : valider une demande de retrait (statut Pending -> Succeeded). */
export async function approveWithdrawal(transactionId: string) {
    const guard = await requireRole(["super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };

    const { error } = await guard.supabase.rpc("fn_process_withdrawal", {
        p_transaction_id: String(transactionId),
        p_approve: true,
        p_reason: null,
    });
    if (error) return { success: false, error: errorMessage(error) };

    revalidatePath("/admin/finance");
    return { success: true };
}

/** Super Admin : refuser un retrait -> les fonds sont recrédités atomiquement. */
export async function rejectWithdrawal(transactionId: string, reason: string) {
    const guard = await requireRole(["super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };

    const { error } = await guard.supabase.rpc("fn_process_withdrawal", {
        p_transaction_id: String(transactionId),
        p_approve: false,
        p_reason: reason || null,
    });
    if (error) return { success: false, error: errorMessage(error) };

    revalidatePath("/admin/finance");
    return { success: true };
}

/** Super Admin : ajustement de solde avec motif (journalisé). */
export async function adjustWalletBalance(userId: string, amount: number, reason: string) {
    const guard = await requireRole(["super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };
    if (!Number.isFinite(amount) || amount === 0) return { success: false, error: "Montant invalide" };

    const { data, error } = await guard.supabase.rpc("fn_admin_adjust_wallet", {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
    });
    if (error) return { success: false, error: errorMessage(error) };

    revalidatePath("/admin/finance");
    revalidatePath("/admin/users");
    return { success: true, newBalance: Number(data) };
}
