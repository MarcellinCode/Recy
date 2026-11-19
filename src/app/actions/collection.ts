"use server";

import { revalidatePath } from "next/cache";
import { requireRole, errorMessage } from "@/lib/auth-guards";

/**
 * Finalise une collecte (pesée finale + paiement + éco-taxe).
 * Toute la logique financière est exécutée de façon atomique par la RPC
 * sécurisée `fn_finalize_collection` (identique au mobile).
 * Les notifications (in-app + push mobile/web) sont créées par la RPC et
 * envoyées automatiquement par la base (trigger tr_notification_push).
 */
export async function confirmCollection(wasteId: string, finalWeight: number) {
    const guard = await requireRole(["collecteur", "agent_collecteur", "organisation_admin", "super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };
    const { supabase } = guard;

    const weight = Number(finalWeight);
    if (!Number.isFinite(weight) || weight <= 0) {
        return { success: false, error: "Le poids final doit être strictement positif." };
    }

    const { data, error } = await supabase.rpc("fn_finalize_collection", {
        p_waste_id: wasteId,
        p_final_weight: weight,
    });

    if (error) return { success: false, error: errorMessage(error) };
    if (!data?.success) return { success: false, error: data?.error || "Finalisation impossible." };

    revalidatePath(`/mes-dechets/${wasteId}`);
    revalidatePath("/wallet");
    revalidatePath("/missions");
    revalidatePath("/reservations");

    return { success: true, totalAmount: Number(data.total_amount) || 0 };
}
