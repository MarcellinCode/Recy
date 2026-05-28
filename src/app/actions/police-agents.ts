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

    // Client admin pour la gestion des utilisateurs (uniquement après vérification)
    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey);

    try {
        // 1. Création du compte Auth (Confirmé automatiquement)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email,
            password: formData.password,
            email_confirm: true,
            user_metadata: {
                full_name: formData.fullName,
                role: 'agent_police_verte',
                phone: formData.phone,
                city: formData.city
            }
        });

        if (authError) throw authError;

        // 2. Forçage du profil (Le trigger handle_new_user s'occupe du reste, mais on assure la zone)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                zone_id: formData.zoneId,
                status: 'Actif'
            })
            .eq('id', authData.user.id);

        if (profileError) console.error('Agent Profile Update Error:', profileError);

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
