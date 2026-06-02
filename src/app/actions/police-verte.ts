"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { issueSanction } from "./mairie";

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

export async function updateInfractionStatus(id: string, status: string) {
    const supabase = await createClient();
    
    try {
        const { error } = await supabase
            .from('environmental_infractions')
            .update({ 
                status,
                resolved_at: status === 'resolved' || status === 'sanctioned' ? new Date().toISOString() : null
            })
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/city-os');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function convertInfractionToSanction(infractionId: string, penaltyAmount: number) {
    const supabase = await createClient();
    
    try {
        // 1. Récupérer les détails de l'infraction
        const { data: infraction, error: fetchError } = await supabase
            .from('environmental_infractions')
            .select('*')
            .eq('id', infractionId)
            .single();

        if (fetchError || !infraction) throw new Error("Infraction introuvable");
        if (!infraction.responsible_org_id) throw new Error("Aucune organisation responsable identifiée pour cette infraction.");

        // 2. Émettre la sanction via le module Mairie existant
        const sanctionRes = await issueSanction(
            infraction.responsible_org_id,
            `INFRACTION: ${infraction.type}`,
            infraction.description || "Sanction issue d'un rapport Police Verte",
            infraction.severity,
            penaltyAmount
        );

        if (!sanctionRes.success) throw new Error(sanctionRes.error);

        // 3. Mettre à jour le statut de l'infraction
        await updateInfractionStatus(infractionId, 'sanctioned');

        revalidatePath('/city-os');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getInfractionStats() {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('environmental_infractions')
            .select('status, severity, type');

        if (error) throw error;

        const stats = {
            total: data.length,
            open: data.filter(i => i.status === 'open').length,
            critical: data.filter(i => i.severity === 'critical').length,
            types: data.reduce((acc: any, i) => {
                acc[i.type] = (acc[i.type] || 0) + 1;
                return acc;
            }, {})
        };

        return { success: true, stats };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
