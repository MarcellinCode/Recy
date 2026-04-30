"use server";

import { createClient } from '@supabase/supabase-js'
import { fetchCommuneData } from '@/lib/geoService';
import { getMunicipalityGeo } from '@/lib/geoIntelligence';

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
                role: 'mairie',
                subscription_tier: 'mairie_elite',
                phone: formData.phone,
                city: formData.city,
                status: 'Actif',
                official_department: formData.officialDepartment
            });

        if (profileError) {
            console.error('Profile Sync Error:', profileError);
        } else {
            // 🟢 NOUVEAU : Intelligence Totale - Récupération dynamique des frontières OSM
            const osmData = await fetchCommuneData(formData.city);
            
            let boundaries: any;
            let lat: number;
            let lng: number;

            if (osmData && osmData.isValidGeometry) {
                // On a trouvé les vraies frontières sur OpenStreetMap
                lat = osmData.center[0];
                lng = osmData.center[1];
                boundaries = {
                    type: "Feature",
                    geometry: osmData.geojson,
                    properties: { display_name: osmData.displayName }
                };
            } else {
                // Fallback sur le dictionnaire local ou valeur par défaut
                const geoInfo = getMunicipalityGeo(formData.city || formData.municipalityName);
                lat = geoInfo.center[0];
                lng = geoInfo.center[1];
                boundaries = {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [geoInfo.boundaries]
                    }
                };
            }
            
            await supabaseAdmin.from('zones').insert({
                name: `TERRITOIRE OFFICIEL - ${formData.municipalityName}`,
                city: formData.city,
                created_by: authData.user.id,
                status: 'available',
                latitude: lat,
                longitude: lng,
                boundaries: boundaries
            });
        }

        return { success: true, userId: authData.user.id };
    } catch (error: any) {
        console.error('Error creating Mairie:', error);
        return { success: false, error: error?.message || "Erreur lors de l'enregistrement." };
    }
}
