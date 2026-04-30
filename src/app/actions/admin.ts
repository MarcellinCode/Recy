"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/**
 * Super Admin: manual adjustment of a user's wallet
 */
export async function adjustWallet(userId: string, amount: number, isAddition: boolean) {
    const supabase = await createClient();
    
    // 🛡️ SÉCURISATION : Vérification de l'identité et du rôle Super Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!adminProfile || adminProfile.role !== 'super_admin') {
        throw new Error("Action non autorisée. Réservée aux Super Admins.");
    }
    
    // 1. Get current balance
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
    
    if (fetchError) throw new Error("Profil introuvable");

    const currentBalance = profile.wallet_balance || 0;
    const newBalance = isAddition ? currentBalance + amount : currentBalance - amount;

    // 2. Update profile
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);

    if (updateError) throw new Error("Échec de la mise à jour du portefeuille");

    // 3. Log transaction
    await supabase.from('transactions').insert({
        user_id: userId,
        amount: amount,
        type: isAddition ? 'income' : 'expense',
        status: 'completed',
        description: `Ajustement manuel par Super Admin: ${isAddition ? '+' : '-'}${amount}`
    });

    revalidatePath("/admin/users");
    return { success: true, newBalance };
}

/**
 * Super Admin: force role update
 */
export async function updateSystemRole(userId: string, newRole: string) {
    const supabase = await createClient();
    
    // 🛡️ SÉCURISATION : Vérification de l'identité et du rôle Super Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!adminProfile || adminProfile.role !== 'super_admin') {
        throw new Error("Action non autorisée. Réservée aux Super Admins.");
    }

    // 🛡️ ANTI-MUTINERIE : Empêcher de dégrader un autre Super Admin
    const { data: targetProfile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (targetProfile && targetProfile.role === 'super_admin' && newRole !== 'super_admin') {
        throw new Error("Action interdite : Vous ne pouvez pas rétrograder un autre Super Admin.");
    }
    
    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) throw new Error("Échec de changement de rôle");

    revalidatePath("/admin/users");
    return { success: true };
}
