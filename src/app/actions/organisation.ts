"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getAdminClient, generatePassword, errorMessage } from "@/lib/auth-guards";

/**
 * ACTIONS POUR LES ORGANISATIONS (B2B)
 */

const ORG_ROLES = ["organisation_admin", "super_admin"] as const;

/** L'organisation a-t-elle un abonnement actif (palier 'organisation') ? */
function hasOrgSubscription(tier: string | null, role: string) {
    return role === "super_admin" || tier === "organisation";
}

/**
 * Recrute un agent collecteur rattaché à l'organisation.
 * - Le rôle est TOUJOURS 'agent_collecteur' (plus d'injection de rôle possible).
 * - Le PIN n'est plus stocké en clair ; un mot de passe robuste est généré
 *   et renvoyé UNE fois pour être transmis à l'agent.
 */
export async function addAgent(formData: {
    fullName: string;
    phone: string;
    email?: string;
    role?: string;
    vehicleId?: string;
    zoneId?: string;
    pin?: string;
}) {
    const guard = await requireRole([...ORG_ROLES]);
    if (!guard.ok) return { success: false, error: guard.error };
    const { user, profile } = guard;

    if (!hasOrgSubscription(profile.subscription_tier, profile.role)) {
        return { success: false, error: "Abonnement Organisation requis pour recruter des agents." };
    }
    if (!formData.fullName?.trim() || !formData.phone?.trim()) {
        return { success: false, error: "Nom et téléphone obligatoires." };
    }

    const admin = getAdminClient();
    if (!admin) return { success: false, error: "Configuration admin manquante." };

    const digits = formData.phone.replace(/\D/g, "");
    const email = formData.email?.trim()
        ? formData.email.trim().toLowerCase()
        : `agent.${digits}@cleanzone.tech`;
    const password = generatePassword();

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: "agent_collecteur" },
        user_metadata: { full_name: formData.fullName.trim(), phone: formData.phone.trim() },
    });
    if (authError || !authData.user) {
        return { success: false, error: errorMessage(authError, "Erreur lors de la création de l'agent") };
    }

    // Le véhicule doit appartenir à l'organisation
    let vehicleId: string | null = null;
    if (formData.role === "driver" && formData.vehicleId) {
        const { data: vehicle } = await guard.supabase
            .from("vehicles")
            .select("id")
            .eq("id", formData.vehicleId)
            .eq("organization_id", user.id)
            .maybeSingle();
        vehicleId = vehicle?.id ?? null;
    }

    const update: Record<string, unknown> = {
        role: "agent_collecteur",
        organization_id: user.id,
        city: formData.zoneId ? `Zone ${formData.zoneId}` : "À définir",
        status: "Actif",
    };
    if (vehicleId) update.assigned_vehicle_id = vehicleId;

    const { error: profileError } = await admin.from("profiles").update(update).eq("id", authData.user.id);
    if (profileError) {
        // On annule pour ne pas laisser un compte à moitié créé
        await admin.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: errorMessage(profileError) };
    }

    revalidatePath("/organisation");
    return { success: true, credentials: { email, password } };
}

export async function getOrganizationContext() {
    const guard = await requireRole();
    if (!guard.ok) return { success: false, error: guard.error };
    const { supabase, user } = guard;

    const [{ data: profile }, { data: agents }, { data: concessionsRaw }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("profiles").select("*").eq("organization_id", user.id),
        supabase.from("concessions").select("*").eq("organization_id", user.id).eq("status", "active"),
    ]);

    type Row = Record<string, unknown> & { id?: string; zone_id?: string };
    let concessions: Row[] = (concessionsRaw as Row[] | null) || [];
    const zoneIds = concessions.map((c) => c.zone_id).filter(Boolean) as string[];
    if (zoneIds.length > 0) {
        const { data: zonesData } = await supabase.from("zones").select("*").in("id", zoneIds);
        const zones = (zonesData as Row[] | null) || [];
        concessions = concessions.map((c) => ({
            ...c,
            zones: zones.find((z) => z.id === c.zone_id) || null,
        }));
    }

    return { success: true, profile, agents: agents || [], concessions };
}

export async function assignAgentToZone(agentId: string, zoneId: string) {
    const guard = await requireRole([...ORG_ROLES]);
    if (!guard.ok) return { success: false, error: guard.error };
    const { supabase, user, profile } = guard;

    if (!hasOrgSubscription(profile.subscription_tier, profile.role)) {
        return { success: false, error: "Accès refusé : abonnement requis pour la gestion tactique." };
    }

    const { data, error } = await supabase
        .from("profiles")
        .update({ city: `Zone ${zoneId}` })
        .eq("id", agentId)
        .eq("organization_id", user.id) // l'agent doit appartenir à l'organisation
        .select("id");

    if (error) return { success: false, error: errorMessage(error) };
    if (!data || data.length === 0) return { success: false, error: "Agent introuvable dans votre organisation." };

    revalidatePath("/organisation");
    return { success: true };
}

/** Prise en charge d'un lot publié (réservation atomique, quotas vérifiés en base). */
export async function takeChargeOfWaste(wasteId: string) {
    const guard = await requireRole(["organisation_admin", "collecteur", "agent_collecteur"]);
    if (!guard.ok) return { success: false, error: guard.error };

    const { error } = await guard.supabase.rpc("reserve_waste", {
        p_waste_id: wasteId,
        p_collecteur_id: guard.user.id,
    });
    if (error) {
        const msg = errorMessage(error);
        if (msg.includes("WASTE_ALREADY_RESERVED")) return { success: false, error: "Ce lot vient d'être réservé par quelqu'un d'autre." };
        if (msg.includes("WASTE_UNAVAILABLE")) return { success: false, error: "Ce lot n'est plus disponible." };
        if (msg.includes("QUOTA_REACHED")) return { success: false, error: "Quota atteint : 3 réservations/mois en plan gratuit." };
        return { success: false, error: msg };
    }

    revalidatePath("/organisation");
    revalidatePath("/reservations");
    return { success: true };
}

/** Affecte un agent de l'organisation à un lot réservé (crée sa mission). */
export async function assignAgentToWaste(wasteId: string, agentId: string) {
    const guard = await requireRole([...ORG_ROLES]);
    if (!guard.ok) return { success: false, error: guard.error };

    const { error } = await guard.supabase.rpc("fn_assign_agent_to_waste", {
        p_waste_id: wasteId,
        p_agent_id: agentId,
    });
    if (error) return { success: false, error: errorMessage(error) };

    revalidatePath("/organisation");
    return { success: true };
}

/** Envoie un agent nettoyer un dépôt sauvage signalé (crée une mission sans paiement). */
export async function dispatchAgentToInfraction(infractionId: string, agentId: string) {
    const guard = await requireRole(["organisation_admin", "mairie", "super_admin"]);
    if (!guard.ok) return { success: false, error: guard.error };

    const { error } = await guard.supabase.rpc("fn_dispatch_agent_to_infraction", {
        p_infraction_id: infractionId,
        p_agent_id: agentId,
    });
    if (error) return { success: false, error: errorMessage(error) };

    revalidatePath("/organisation");
    revalidatePath("/city-os");
    return { success: true };
}
