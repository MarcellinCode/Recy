"use server";

import { revalidatePath } from "next/cache";
import { requireRole, errorMessage } from "@/lib/auth-guards";

type ZoneOwner = { organization_id: string | null; created_by: string | null } | null;

/** Une zone appartient à la Mairie qui l'a créée (organization_id ou created_by selon l'écran d'origine). */
function ownsZone(zone: ZoneOwner, userId: string, role: string) {
    if (role === "super_admin") return true;
    return !!zone && (zone.organization_id === userId || zone.created_by === userId);
}

/**
 * Attribuer directement une zone à une organisation (Souveraineté Mairie)
 */
export async function assignConcessionDirectly(data: {
    zone_id: string;
    organization_id: string;
    duration_months: number;
}) {
    const guard = await requireRole(["mairie", "super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };
    const { supabase, user, profile } = guard;

    if (!Number.isFinite(data.duration_months) || data.duration_months <= 0) {
        return { success: false, error: "Durée de concession invalide." };
    }

    const [{ data: zone }, { data: target }, { data: existing }] = await Promise.all([
        supabase.from("zones").select("organization_id, created_by").eq("id", data.zone_id).single(),
        supabase.from("profiles").select("role, status").eq("id", data.organization_id).single(),
        supabase.from("concessions").select("id").eq("zone_id", data.zone_id).eq("status", "active").limit(1),
    ]);

    if (!ownsZone(zone, user.id, profile.role)) {
        return { success: false, error: "Action non autorisée. Cette zone n'appartient pas à votre juridiction." };
    }
    // Bénéficiaire : organisation / ONG, ou entreprise privée de collecte (collecteur)
    if (target?.role !== "organisation_admin" && target?.role !== "collecteur") {
        return { success: false, error: "Le bénéficiaire doit être une organisation ou une entreprise de collecte agréée." };
    }
    if (target.status === "Suspendu") {
        return { success: false, error: "Cette organisation est suspendue." };
    }
    if (existing && existing.length > 0) {
        return { success: false, error: "Cette zone a déjà une concession active. Révoquez-la d'abord." };
    }

    const rent_end = new Date();
    rent_end.setMonth(rent_end.getMonth() + data.duration_months);

    const { error: concessionError } = await supabase.from("concessions").insert({
        zone_id: data.zone_id,
        organization_id: data.organization_id,
        rent_end: rent_end.toISOString(),
        status: "active",
    });
    if (concessionError) return { success: false, error: errorMessage(concessionError) };

    await supabase.from("zones").update({ status: "rented" }).eq("id", data.zone_id);

    revalidatePath("/city-os");
    return { success: true };
}

/**
 * Révoquer manuellement une concession (Souveraineté)
 */
export async function revokeConcession(concessionId: string, zoneId: string) {
    const guard = await requireRole(["mairie", "super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };
    const { supabase, user, profile } = guard;

    const { data: zone } = await supabase.from("zones").select("organization_id, created_by").eq("id", zoneId).single();
    if (!ownsZone(zone, user.id, profile.role)) {
        return { success: false, error: "Action non autorisée. Cette zone n'appartient pas à votre juridiction." };
    }

    const { data: updated, error } = await supabase
        .from("concessions")
        .update({ status: "expired", rent_end: new Date().toISOString() })
        .eq("id", concessionId)
        .eq("zone_id", zoneId) // la concession doit porter sur cette zone
        .select("id");

    if (error) return { success: false, error: errorMessage(error) };
    if (!updated || updated.length === 0) return { success: false, error: "Concession introuvable pour cette zone." };

    await supabase.from("zones").update({ status: "available" }).eq("id", zoneId);

    revalidatePath("/city-os");
    return { success: true };
}

/**
 * Nettoyage automatique des concessions expirées (zones de la Mairie connectée)
 */
export async function checkAndCleanupExpiredConcessions() {
    const guard = await requireRole(["mairie", "super_admin"]);
    if (!guard.ok) return { success: false, count: 0 };
    const { supabase } = guard;

    const { data: expired } = await supabase
        .from("concessions")
        .select("id, zone_id")
        .eq("status", "active")
        .lt("rent_end", new Date().toISOString());

    if (!expired || expired.length === 0) return { success: true, count: 0 };

    // La RLS limite la mise à jour aux zones dont la Mairie est propriétaire
    const { data: updated } = await supabase
        .from("concessions")
        .update({ status: "expired" })
        .in("id", expired.map((c) => c.id))
        .select("zone_id");

    const zoneIds = (updated || []).map((c) => c.zone_id).filter(Boolean);
    if (zoneIds.length) await supabase.from("zones").update({ status: "available" }).in("id", zoneIds);

    revalidatePath("/city-os");
    return { success: true, count: updated?.length || 0 };
}

/**
 * Organisations candidates avec un score de performance calculé
 */
export async function getOrganizationsForConcession() {
    const guard = await requireRole(["mairie", "super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };
    const { supabase } = guard;

    const { data: orgs, error } = await supabase
        .from("profiles")
        .select("id, full_name, agent_count, role, status")
        .in("role", ["organisation_admin", "collecteur"]);
    if (error) return { success: false, error: errorMessage(error) };

    const orgIds = (orgs || []).map((o) => o.id);
    const { data: wasteStats } = orgIds.length
        ? await supabase.from("wastes").select("collector_id, status").in("collector_id", orgIds)
        : { data: [] as { collector_id: string; status: string }[] };

    const enrichedOrgs = (orgs || []).map((org) => {
        const orgCollections = wasteStats?.filter((w) => w.collector_id === org.id) || [];
        const successCount = orgCollections.filter((w) => w.status === "collected").length;
        const totalCount = orgCollections.length;

        let performanceScore = totalCount > 0 ? (successCount / totalCount) * 5 : 0;
        if (org.agent_count && Number.parseInt(String(org.agent_count), 10) > 10) performanceScore += 0.5;

        return {
            ...org,
            performanceScore: Math.min(5, Math.max(0, performanceScore)).toFixed(1),
            totalCollections: successCount,
        };
    });

    return {
        success: true,
        organizations: enrichedOrgs.sort((a, b) => Number(b.performanceScore) - Number(a.performanceScore)),
    };
}
