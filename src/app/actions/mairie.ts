"use server";

import { revalidatePath } from "next/cache";
import { requireRole, errorMessage } from "@/lib/auth-guards";

/** Mairie : réquisition d'urgence d'un agent sur un lot (mission prioritaire). */
export async function dispatchEmergencyAgent(wasteId: string, agentId: string) {
    const guard = await requireRole(["mairie", "super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };

    const { error } = await guard.supabase.rpc("fn_dispatch_emergency_agent", {
        p_waste_id: wasteId,
        p_agent_id: agentId,
    });
    if (error) return { success: false, error: errorMessage(error) };

    revalidatePath("/city-os");
    return { success: true };
}

/**
 * Mairie : sanction administrative.
 * L'amende est réellement débitée, le score baisse et l'organisation est
 * suspendue automatiquement sous 2.5/5 (le tout de façon atomique en base).
 */
export async function issueSanction(
    organizationId: string,
    type: string,
    description: string,
    severity: string = "medium",
    penaltyAmount: number = 0
) {
    const guard = await requireRole(["mairie", "super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };

    const amount = Number(penaltyAmount);
    if (!Number.isFinite(amount) || amount < 0) return { success: false, error: "Montant d'amende invalide" };

    const { data, error } = await guard.supabase.rpc("fn_issue_sanction", {
        p_organization_id: organizationId,
        p_type: type,
        p_description: description,
        p_severity: severity,
        p_penalty: amount,
    });
    if (error) return { success: false, error: errorMessage(error) };

    revalidatePath("/city-os");
    return { success: true, score: Number(data?.score), suspended: Boolean(data?.suspended) };
}
