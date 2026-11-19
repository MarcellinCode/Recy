"use server";

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/**
 * Recruter un agent de Police Verte (Action Administrative Mairie)
 */
export async function createPoliceAgent(formData: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    city: string;
    zoneId?: string;
}) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return { 
            success: false, 
            error: "Configuration admin manquante (SERVICE_ROLE_KEY)." 
        };
    }

    // 🛡️ VÉRIFICATION D'AUTHENTIFICATION ET DE RÔLE (Protection Escalade Privilèges)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Action non autorisée. Utilisateur non authentifié." };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'mairie' && profile.role !== 'super_admin')) {
        return { success: false, error: "Action non autorisée. Rôle Mairie ou Super Admin requis." };
    }

    // Sans zone, le trigger territorial bloque TOUS les PV de l'agent
    if (!formData.zoneId) {
        return { success: false, error: "Veuillez affecter une zone (juridiction) à l'agent." };
    }
    if (!formData.password || formData.password.length < 8) {
        return { success: false, error: "Le mot de passe doit contenir au moins 8 caractères." };
    }

    // Une Mairie ne peut affecter un agent qu'à une zone de son territoire
    if (profile.role === 'mairie') {
        const { data: zone } = await supabase
            .from('zones')
            .select('organization_id, created_by')
            .eq('id', formData.zoneId)
            .single();
        if (!zone || (zone.organization_id !== user.id && zone.created_by !== user.id)) {
            return { success: false, error: "Cette zone n'appartient pas à votre territoire." };
        }
    }

    // Client admin pour la gestion des utilisateurs (uniquement après vérification)
    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey);

    try {
        // 1. Création du compte Auth (rôle dans app_metadata, non modifiable par le client)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            email_confirm: true,
            app_metadata: { role: 'agent_police_verte' },
            user_metadata: {
                full_name: formData.fullName,
                phone: formData.phone,
                city: formData.city
            }
        });

        if (authError) throw authError;

        // 2. Juridiction de l'agent
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                role: 'agent_police_verte',
                zone_id: formData.zoneId,
                organization_id: user.id,
                status: 'Actif'
            })
            .eq('id', authData.user.id);

        if (profileError) throw profileError;

        revalidatePath('/city-os');
        return { success: true, agentId: authData.user.id };
    } catch (error: any) {
        console.error('Error creating Police Agent:', error);
        return { success: false, error: error?.message || "Erreur lors du recrutement." };
    }
}

/**
 * Récupérer la liste des agents de Police Verte
 */
export async function getPoliceAgents() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) return { success: false, error: "Config missing" };

    // 🛡️ VÉRIFICATION D'AUTHENTIFICATION ET DE RÔLE (Protection Fuite de Données)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Action non autorisée. Utilisateur non authentifié." };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'mairie' && profile.role !== 'super_admin')) {
        return { success: false, error: "Action non autorisée. Rôle Mairie ou Super Admin requis." };
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey);

    try {
        const { data: agents, error: agentsError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', 'agent_police_verte')
            .order('created_at', { ascending: false });

        if (agentsError) throw agentsError;

        // Fetch all zones to map them in memory
        const { data: zones, error: zonesError } = await supabaseAdmin
            .from('zones')
            .select('id, name');

        if (zonesError) console.error("Error fetching zones in getPoliceAgents:", zonesError);

        const enrichedAgents = (agents || []).map(agent => ({
            ...agent,
            zones: zones ? zones.find(z => z.id === agent.zone_id) : null
        }));

        return { success: true, agents: enrichedAgents };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
