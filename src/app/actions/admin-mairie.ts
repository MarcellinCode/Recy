"use server";

import { fetchCommuneData } from '@/lib/geoService';
import { getMunicipalityGeo } from '@/lib/geoIntelligence';
import { requireRole, getAdminClient } from '@/lib/auth-guards';

// Action serveur pour créer un compte Mairie — RÉSERVÉE AU SUPER ADMIN
export async function createMairieAccount(formData: {
    municipalityName: string;
    officialDepartment: string;
    email: string;
    password: string;
    phone: string;
    city: string;
}) {
    // 🛡️ Sans ce contrôle, n'importe quel visiteur pouvait créer une Mairie
    const guard = await requireRole(['super_admin']);
    if (!guard.ok) return { success: false, error: guard.error };

    if (!formData.password || formData.password.length < 8) {
        return { success: false, error: "Le mot de passe doit contenir au moins 8 caractères." };
    }

    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
        return {
            success: false,
            error: "Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY). Veuillez vérifier vos variables d'environnement Vercel."
        };
    }

    try {
        // 1. Création du compte. Le rôle est placé dans app_metadata
        //    (non modifiable par l'utilisateur) : c'est ce que lit le trigger.
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            email_confirm: true,
            app_metadata: { role: 'mairie' },
            user_metadata: {
                full_name: formData.municipalityName,
                city: formData.city,
                phone: formData.phone,
                official_department: formData.officialDepartment
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
                subscription_tier: 'mairie',
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

            if (osmData?.isValidGeometry) {
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
                organization_id: authData.user.id,
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
