"use server";

import { createClient } from "@/lib/supabase-server";

export async function createInvitation(targetEmail?: string) {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Non authentifié" };
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'super_admin') {
        return { success: false, error: "Non autorisé" };
    }

    const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const { data, error } = await supabase.from('system_invitations').insert({
        code,
        role: 'mairie',
        target_email: targetEmail || null,
        created_by: user.id
    }).select().single();

    if (error) {
        console.error("Error creating invitation:", error);
        return { success: false, error: error.message };
    }

    return { success: true, invitation: data };
}

export async function getInvitations() {
    const supabase = await createClient();
    
    // Check authorization first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, invitations: [] };
    
    const { data, error } = await supabase.from('system_invitations')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching invitations:", error);
        return { success: false, invitations: [] };
    }
    
    return { success: true, invitations: data || [] };
}

export async function validateInvitation(code: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase.from('system_invitations')
        .select('*')
        .eq('code', code)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single();
        
    if (error || !data) {
        return { valid: false };
    }
    
    return { valid: true, invitation: data };
}

export async function consumeInvitation(code: string, userId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase.from('system_invitations')
        .update({ is_used: true, used_by: userId })
        .eq('code', code);
        
    if (error) {
        console.error("Error consuming invitation:", error);
        return false;
    }
    
    return true;
}
