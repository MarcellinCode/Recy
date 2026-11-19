"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { issueSanction } from "./mairie";
import { requireRole, errorMessage } from "@/lib/auth-guards";

export async function reportInfraction(data: {
    type: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    latitude: number;
    longitude: number;
    images?: string[];
    zone_id?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    try {
        let responsible_org_id = null;

        // Si une zone est spécifiée, on cherche l'organisation qui a la concession
        if (data.zone_id) {
            const { data: concession } = await supabase
                .from('concessions')
                .select('organization_id')
                .eq('zone_id', data.zone_id)
                .eq('status', 'active')
                .maybeSingle();
            
            if (concession) {
                responsible_org_id = concession.organization_id;
            }
        }

        const { data: infraction, error } = await supabase
            .from('environmental_infractions')
            .insert({
                reported_by: user.id,
                zone_id: data.zone_id,
                responsible_org_id,
                type: data.type,
                description: data.description,
                severity: data.severity,
                latitude: data.latitude,
                longitude: data.longitude,
                images: data.images || [],
                status: 'open'
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/city-os');
        return { success: true, data: infraction };
    } catch (error: any) {
        console.error("Error reporting infraction:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Mise à jour du statut d'une infraction.
 * Les droits (Mairie, agent de la zone, organisation responsable) sont
 * vérifiés en base par fn_update_infraction_status.
 * (Avant : aucune policy UPDATE -> la mise à jour était ignorée en silence.)
 */
export async function updateInfractionStatus(id: string, status: string) {
    const guard = await requireRole(["mairie", "super_admin", "agent_police_verte", "organisation_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };

    const { error } = await guard.supabase.rpc("fn_update_infraction_status", { p_id: id, p_status: status });
    if (error) return { success: false, error: errorMessage(error) };

    revalidatePath('/city-os');
    revalidatePath('/organisation');
    return { success: true };
}

export async function convertInfractionToSanction(infractionId: string, penaltyAmount: number) {
    const guard = await requireRole(["mairie", "super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };

    try {
        const { data: infraction, error: fetchError } = await guard.supabase
            .from('environmental_infractions')
            .select('id, type, description, severity, responsible_org_id, status')
            .eq('id', infractionId)
            .single();

        if (fetchError || !infraction) throw new Error("Infraction introuvable");
        if (infraction.status === 'sanctioned') throw new Error("Cette infraction a déjà été sanctionnée.");
        if (!infraction.responsible_org_id) throw new Error("Aucune organisation responsable identifiée pour cette infraction.");

        const sanctionRes = await issueSanction(
            infraction.responsible_org_id,
            `INFRACTION: ${infraction.type}`,
            infraction.description || "Sanction issue d'un rapport Police Verte",
            infraction.severity,
            penaltyAmount
        );
        if (!sanctionRes.success) throw new Error(sanctionRes.error);

        const statusRes = await updateInfractionStatus(infractionId, 'sanctioned');
        if (!statusRes.success) throw new Error(statusRes.error);

        revalidatePath('/city-os');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: errorMessage(error) };
    }
}

export async function getInfractionStats() {
    const guard = await requireRole(["mairie", "super_admin", "agent_police_verte"]);
    if (!guard.ok) return { success: false, error: guard.error };

    const { data, error } = await guard.supabase
        .from('environmental_infractions')
        .select('status, severity, type');
    if (error) return { success: false, error: errorMessage(error) };

    const stats = {
        total: data.length,
        open: data.filter((i) => i.status === 'open').length,
        critical: data.filter((i) => i.severity === 'critical').length,
        types: data.reduce((acc: Record<string, number>, i) => {
            acc[i.type] = (acc[i.type] || 0) + 1;
            return acc;
        }, {})
    };
    return { success: true, stats };
}
