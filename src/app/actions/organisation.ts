"use client";

import { createClient } from "@/lib/supabase";

/**
 * ACTIONS POUR LES ORGANISATIONS (B2B)
 */

export async function inviteAgent(email: string, fullName: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non connecté" };

    // Simulation d'invitation (en production, cela enverrait un email via Resend/Supabase Auth)
    // On crée directement un profil en attente ou on prépare l'ID
    const { data, error } = await supabase
        .from('profiles')
        .insert([{
            full_name: fullName,
            role: 'agent_collecteur',
            organization_id: user.id, // L'organisation est le user actuel
            city: 'À définir'
        }]);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function getOrganizationContext() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non connecté" };

    // 1. Fetch Organization Information
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // 2. Fetch Linked Agents
    const { data: agents } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', user.id);

    // 3. Fetch Active Concessions (Zones won)
    const { data: concessions } = await supabase
        .from('concessions')
        .select('*, zones(*)')
        .eq('organisation_id', user.id)
        .eq('status', 'active');

    return {
        success: true,
        profile,
        agents: agents || [],
        concessions: concessions || []
    };
}

export async function assignAgentToZone(agentId: string, zoneId: string) {
    const supabase = createClient();
    // On pourrait ajouter une table de liaison ou un champ sur le profil de l'agent
    const { error } = await supabase
        .from('profiles')
        .update({ city: `Zone ${zoneId}` }) // Simulation simplifiée
        .eq('id', agentId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}
