"use server";
 
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";

/**
 * ACTIONS POUR LES ORGANISATIONS (B2B)
 */

export async function addAgent(formData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non connecté" };

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    if (profile?.subscription_tier !== 'organisation' && profile?.subscription_tier !== 'mairie') {
        return { success: false, error: "Accès refusé" };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return { success: false, error: "Configuration admin manquante." };
    }

    const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey);

    try {
        // 1. Création de l'utilisateur Auth
        // Si aucun email n'est fourni, on génère un email par défaut unique basé sur le numéro de téléphone
        const emailToUse = formData.email?.trim() 
            ? formData.email.trim() 
            : `agent.${formData.phone.replace(/[^0-9]/g, '')}@cleanzone.tech`;

        // On génère un mot de passe aléatoire sécurisé (cryptographique) pour éviter les mots de passe en dur
        const generatedPassword = crypto.randomBytes(12).toString('hex') + "!";
        const defaultPassword = formData.pin ? `Agent${formData.pin}!` : generatedPassword;
        
        // On mappe les rôles de l'interface ('collector' ou 'driver') vers le rôle de base de données 'agent_collecteur'
        const mappedRole = (formData.role === 'collector' || formData.role === 'driver')
            ? 'agent_collecteur'
            : formData.role;

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: emailToUse,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: {
                full_name: formData.fullName,
                role: mappedRole,
                phone: formData.phone
            }
        });

        if (authError) throw authError;

        // 2. Mise à jour du profil (le trigger crée le profil basique, on ajoute les détails)
        const agentData: any = {
            app_pin: formData.pin,
            organization_id: user.id,
            city: formData.zoneId ? `Zone ${formData.zoneId}` : 'À définir',
            status: 'Actif'
        };

        if (formData.role === 'driver' && formData.vehicleId) {
            agentData.assigned_vehicle_id = formData.vehicleId;
        }

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(agentData)
            .eq('id', authData.user.id);

        if (profileError) throw profileError;
        
    } catch (err: any) {
        console.error('Error adding agent:', err);
        return { success: false, error: err.message || "Erreur lors de la création de l'agent" };
    }
    
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
    const { data: concessionsRaw } = await supabase
        .from('concessions')
        .select('*')
        .eq('organization_id', user.id)
        .eq('status', 'active');

    let concessions = concessionsRaw || [];

    if (concessions.length > 0) {
        const zoneIds = concessions.map((c: any) => c.zone_id).filter(Boolean);
        if (zoneIds.length > 0) {
            const { data: zonesData } = await supabase
                .from('zones')
                .select('*')
                .in('id', zoneIds);
            
            concessions = concessions.map((c: any) => ({
                ...c,
                zones: zonesData?.find((z: any) => z.id === c.zone_id) || null
            }));
        }
    }

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
    if (profile?.subscription_tier !== 'organisation' && profile?.subscription_tier !== 'mairie') {
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
