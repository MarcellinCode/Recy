"use server";

import { createClient } from '@supabase/supabase-js'
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

    // Client admin pour la gestion des utilisateurs
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    try {
        const { data: agents, error } = await supabaseAdmin
            .from('profiles')
            .select('*, zones:zone_id(name)')
            .eq('role', 'agent_police_verte')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, agents };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
