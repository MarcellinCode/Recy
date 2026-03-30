"use server";
 
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/**
 * ACTIONS POUR LES ORGANISATIONS (B2B)
 */

export async function addAgent(formData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non connecté" };

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    if (!profile || (profile.subscription_tier !== 'organisation' && profile.subscription_tier !== 'mairie')) {
        return { success: false, error: "Accès refusé" };
    }

    const { data, error } = await supabase
        .from('profiles')
        .insert([{
            full_name: formData.fullName,
            phone: formData.phone,
            email: formData.email,
            role: formData.role, // 'collector' or 'driver'
            organization_id: user.id,
            city: formData.zoneId ? `Zone ${formData.zoneId}` : 'À définir'
        }]);

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/organisation');
    return { success: true };
}

export async function getOrganizationContext() {
    const supabase = await createClient();
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
        .eq('organization_id', user.id)
        .eq('status', 'active');

    return {
        success: true,
        profile,
        agents: agents || [],
        concessions: concessions || []
    };
}

export async function assignAgentToZone(agentId: string, zoneId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non connecté" };

    // Vérification de l'abonnement
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    if (!profile || (profile.subscription_tier !== 'organisation' && profile.subscription_tier !== 'mairie')) {
        return { success: false, error: "Accès refusé : Abonnement requis pour la gestion tactique." };
    }

    const { error } = await supabase
        .from('profiles')
        .update({ city: `Zone ${zoneId}` }) 
        .eq('id', agentId)
        .eq('organization_id', user.id); // Sécurité: l'agent doit appartenir à l'organisation

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/organisation');
    return { success: true };
}
