"use server";

import { createClient } from "@/lib/supabase-server";

export async function approveWithdrawal(transactionId: string) {
    try {
        const supabase = await createClient();
        
        // 1. Vérifier que c'est le super admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Non authentifié");

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'super_admin') throw new Error("Accès refusé");

        // 2. Mettre à jour le statut de la transaction
        const { data: tx, error: fetchError } = await supabase
            .from('transactions')
            .select('status, amount, user_id, type')
            .eq('id', transactionId)
            .single();

        if (fetchError || !tx) throw new Error("Transaction introuvable");
        if (tx.status !== 'Pending') throw new Error("La transaction n'est pas en attente");
        // if (tx.type !== 'withdrawal') throw new Error("Ceci n'est pas une demande de retrait");

        const { error: updateError } = await supabase
            .from('transactions')
            .update({ status: 'Succeeded' })
            .eq('id', transactionId);

        if (updateError) throw updateError;

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function rejectWithdrawal(transactionId: string, reason: string) {
    try {
        const supabase = await createClient();
        
        // 1. Vérifier que c'est le super admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Non authentifié");

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'super_admin') throw new Error("Accès refusé");

        // 2. Récupérer la transaction
        const { data: tx, error: fetchError } = await supabase
            .from('transactions')
            .select('status, amount, user_id, type')
            .eq('id', transactionId)
            .single();

        if (fetchError || !tx) throw new Error("Transaction introuvable");
        if (tx.status !== 'Pending') throw new Error("La transaction n'est pas en attente");

        // 3. Re-créditer le compte (car l'argent est déduit lors de la demande)
        // Utilisation d'un appel direct pour simplifier ou rpc si disponible
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', tx.user_id)
            .single();

        if (profileError) throw new Error("Impossible de trouver le compte utilisateur");

        const newBalance = (userProfile.wallet_balance || 0) + Number(tx.amount);
        
        const { error: refundError } = await supabase
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', tx.user_id);

        if (refundError) throw refundError;

        // 4. Mettre à jour le statut de la transaction
        const { error: updateError } = await supabase
            .from('transactions')
            .update({ 
                status: 'Failed',
                metadata: { rejection_reason: reason }
            })
            .eq('id', transactionId);

        if (updateError) throw updateError;

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function adjustWalletBalance(userId: string, amount: number, reason: string) {
    try {
        const supabase = await createClient();
        
        // 1. Check Super Admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Non authentifié");

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'super_admin') throw new Error("Accès refusé");

        // 2. Ajuster la balance
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', userId)
            .single();

        if (profileError) throw new Error("Compte utilisateur introuvable");

        const newBalance = (userProfile.wallet_balance || 0) + amount;

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 3. Créer une transaction d'ajustement
        const { error: txError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: amount > 0 ? 'income' : 'expense',
                amount: Math.abs(amount),
                status: 'Succeeded',
                payment_method: 'system_adjustment',
                metadata: { reason: reason, adjusted_by: user.id }
            });

        if (txError) throw txError;

        return { success: true, newBalance };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
