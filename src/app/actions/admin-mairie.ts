"use server";

import { createClient } from '@supabase/supabase-js'

// Action serveur pour créer un compte Mairie via l'Admin
// On initialise le client seulement au moment de l'appel pour éviter les erreurs au build
export async function createMairieAccount(formData: {
    municipalityName: string;
    officialDepartment: string;
    email: string;
    password: string;
    phone: string;
    city: string;
}) {
    // Vérification des variables d'environnement sur le serveur
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return { 
            success: false, 
            error: "Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY). Veuillez vérifier vos variables d'environnement Vercel." 
        };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    try {
        // 1. Création de l'utilisateur dans Supabase Auth avec toutes les métadonnées
        // Cela permet au trigger handle_new_user de fonctionner correctement dès le début
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email,
            password: formData.password,
            email_confirm: true,
            user_metadata: {
                full_name: formData.municipalityName,
                role: 'mairie',
                city: formData.city,
                phone: formData.phone,
                official_department: formData.officialDepartment,
                subscription_tier: 'mairie_elite'
            }
        });

        if (authError) throw authError;

        // 2. Synchronisation finale / Forçage du profil (Upsert pour plus de sécurité)
        // Le trigger a normalement déjà fait l'insertion, cet appel sécurise l'opération
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                full_name: formData.municipalityName,
                email: formData.email,
                role: 'mairie',
                subscription_tier: 'mairie_elite',
                phone: formData.phone,
                city: formData.city,
                status: 'Actif',
                official_department: formData.officialDepartment
            });

        if (profileError) throw profileError;

        return { success: true, user: authData.user };
    } catch (error: any) {
        console.error('Error creating Mairie:', error);
        return { success: false, error: error.message };
    }
}
