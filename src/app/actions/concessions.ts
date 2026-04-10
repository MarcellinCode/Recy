"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/**
 * Attribuer directement une zone à une organisation (Souveraineté Mairie)
 */
export async function assignConcessionDirectly(data: {
    zone_id: string;
    organization_id: string;
    duration_months: number;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    // 1. Vérifier que c'est bien une mairie
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'mairie') {
        return { success: false, error: "Seule la Mairie peut attribuer des concessions directes." };
    }

    const rent_end = new Date();
    rent_end.setMonth(rent_end.getMonth() + data.duration_months);

    // 2. Créer la concession
    const { error: concessionError } = await supabase.from('concessions').insert({
        zone_id: data.zone_id,
        organization_id: data.organization_id,
        rent_end: rent_end.toISOString(),
        status: 'active'
    });

    if (concessionError) return { success: false, error: concessionError.message };

    // 3. Mettre à jour le statut de la zone
    const { error: zoneError } = await supabase
        .from('zones')
        .update({ status: 'occupied' })
        .eq('id', data.zone_id);

    if (zoneError) return { success: false, error: zoneError.message };

    revalidatePath('/city-os');
    return { success: true };
}

/**
 * Révoquer manuellement une concession (Souveraineté)
 */
export async function revokeConcession(concessionId: string, zoneId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    // 1. Mettre à jour le statut de la concession
    const { error: concessionError } = await supabase
        .from('concessions')
        .update({ status: 'expired' })
        .eq('id', concessionId);

    if (concessionError) return { success: false, error: concessionError.message };

    // 2. Libérer la zone
    const { error: zoneError } = await supabase
        .from('zones')
        .update({ status: 'available' })
        .eq('id', zoneId);

    if (zoneError) return { success: false, error: zoneError.message };

    revalidatePath('/city-os');
    return { success: true };
}

/**
 * Nettoyage automatique des concessions expirées
 */
export async function checkAndCleanupExpiredConcessions() {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // 1. Trouver les concessions actives qui ont dépassé leur date de fin
    const { data: expired } = await supabase
        .from('concessions')
        .select('id, zone_id')
        .eq('status', 'active')
        .lt('rent_end', now);

    if (!expired || expired.length === 0) return { success: true, count: 0 };

    const concessionIds = expired.map(c => c.id);
    const zoneIds = expired.map(c => c.zone_id);

    // 2. Marquer comme expirées
    await supabase.from('concessions').update({ status: 'expired' }).in('id', concessionIds);

    // 3. Libérer les zones
    await supabase.from('zones').update({ status: 'available' }).in('id', zoneIds);

    revalidatePath('/city-os');
    return { success: true, count: expired.length };
}

/**
 * Récupérer les organisations avec un score de performance simulé/calculé
 */
export async function getOrganizationsForConcession() {
    const supabase = await createClient();
    
    // Récupérer tous les profils avec le rôle entreprise/organisation
    const { data: orgs, error } = await supabase
        .from('profiles')
        .select('id, full_name, agent_count, role')
        .in('role', ['entreprise', 'organisation_admin', 'collecteur']);

    if (error) return { success: false, error: error.message };

    // Calculer un score de performance basique (Nombre de collectes réussies)
    const { data: wasteStats } = await supabase
        .from('wastes')
        .select('collector_id, status');

    const enrichedOrgs = orgs.map(org => {
        const orgCollections = wasteStats?.filter(w => w.collector_id === org.id) || [];
        const successCount = orgCollections.filter(w => w.status === 'collected').length;
        const totalCount = orgCollections.length;
        
        // Score sur 5
        let performanceScore = totalCount > 0 ? (successCount / totalCount) * 5 : 0;
        
        // Petit boost si l'entreprise a beaucoup d'agents (capacité de montée en charge)
        if (org.agent_count && parseInt(org.agent_count) > 10) performanceScore += 0.5;

        return {
            ...org,
            performanceScore: Math.min(5, Math.max(0, performanceScore)).toFixed(1),
            totalCollections: successCount
        };
    });

    // Trier par performance
    return { success: true, organizations: enrichedOrgs.sort((a: any, b: any) => b.performanceScore - a.performanceScore) };
}
