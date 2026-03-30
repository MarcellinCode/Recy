import { createClient } from '@supabase/supabase-js'

// Client avec Service Role pour les actions administratives (bypass RLS & Auth restrictions)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createMairieAccount(formData: {
    municipalityName: string;
    officialDepartment: string;
    email: string;
    password: string;
    phone: string;
    city: string;
}) {
    try {
        // 1. Création de l'utilisateur dans Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email,
            password: formData.password,
            email_confirm: true,
            user_metadata: {
                full_name: formData.municipalityName,
                role: 'mairie'
            }
        });

        if (authError) throw authError;

        // 2. Création/Mise à jour du profil dans la table public.profiles
        // Note: Le trigger d'inscription standard peut déjà avoir créé un profil de base, 
        // mais nous forçons les paramètres Mairie ici.
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                full_name: formData.municipalityName,
                role: 'mairie',
                subscription_tier: 'mairie_elite',
                phone: formData.phone,
                city: formData.city,
                status: 'Actif',
                official_department: formData.officialDepartment
            })
            .eq('id', authData.user.id);

        if (profileError) throw profileError;

        return { success: true, user: authData.user };
    } catch (error: any) {
        console.error('Error creating Mairie:', error);
        return { success: false, error: error.message };
    }
}
