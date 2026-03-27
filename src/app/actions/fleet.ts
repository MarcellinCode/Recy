"use server";

import { createClient } from "@/lib/supabase-server";

export async function getVehicles() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, vehicles: [] };

    // RLS will ensure the user only sees vehicles belonging to their organization
    const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
    
    if (error) {
        console.error("Error fetching vehicles:", error);
        return { success: false, vehicles: [] };
    }
    return { success: true, vehicles: data };
}

export async function addVehicle(name: string, type: string, regNumber: string, initialMileage: number, insuranceExpiry: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data, error } = await supabase.from("vehicles").insert({
        organization_id: user.id,
        name,
        type,
        registration_number: regNumber,
        current_mileage: initialMileage,
        last_oil_change_mileage: initialMileage,
        insurance_expiry_date: insuranceExpiry,
        status: "active",
        next_maintenance_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }).select().single();

    if (error) return { success: false, error: error.message };
    return { success: true, vehicle: data };
}

export async function getMaintenanceLogs(vehicleId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_logs").select("*").eq("vehicle_id", vehicleId).order("performed_at", { ascending: false });
    return { success: !error, logs: data || [] };
}

export async function addMaintenanceLog(vehicleId: string, type: string, description: string, cost: number) {
    const supabase = await createClient();
    const { error } = await supabase.from("maintenance_logs").insert({
        vehicle_id: vehicleId,
        maintenance_type: type,
        description,
        cost_cfa: cost
    });
    
    if (error) return { success: false, error: error.message };
    
    // Mettre à jour la date de dernière maintenance sur le véhicule
    await supabase.from("vehicles").update({
        last_maintenance_date: new Date().toISOString()
    }).eq("id", vehicleId);

    return { success: true };
}
