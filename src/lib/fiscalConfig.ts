"use server";

/**
 * fiscalConfig.ts — Taux fiscaux configurables par la Mairie
 * 
 * Lit depuis la table `platform_settings` (Supabase).
 * Si la table n'existe pas ou si aucune valeur n'est définie,
 * retourne les taux par défaut : commission 10%, éco-taxe 2%.
 * 
 * Table SQL requise (à créer manuellement si besoin) :
 *   CREATE TABLE platform_settings (
 *     key TEXT PRIMARY KEY,
 *     value TEXT NOT NULL,
 *     updated_by UUID REFERENCES profiles(id),
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   INSERT INTO platform_settings (key, value) VALUES
 *     ('commission_rate', '0.10'),
 *     ('eco_tax_rate', '0.02');
 */

import { createClient } from "@/lib/supabase-server";

export interface FiscalConfig {
    commissionRate: number;   // ex: 0.10 = 10% CITICLINE
    ecoTaxRate:     number;   // ex: 0.02 = 2% Mairie
}

const DEFAULTS: FiscalConfig = {
    commissionRate: 0.10,
    ecoTaxRate:     0.02,
};

/**
 * Lit les taux fiscaux depuis platform_settings.
 * Fallback silencieux sur les valeurs par défaut en cas d'erreur.
 */
export async function getFiscalConfig(): Promise<FiscalConfig> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', ['commission_rate', 'eco_tax_rate']);

        if (error || !data || data.length === 0) return DEFAULTS;

        const map: Record<string, number> = {};
        for (const row of data) {
            const parsed = parseFloat(row.value);
            if (!isNaN(parsed)) map[row.key] = parsed;
        }

        return {
            commissionRate: map['commission_rate'] ?? DEFAULTS.commissionRate,
            ecoTaxRate:     map['eco_tax_rate']    ?? DEFAULTS.ecoTaxRate,
        };
    } catch {
        return DEFAULTS;
    }
}

/**
 * Sauvegarde les taux fiscaux dans platform_settings.
 * Réservé à la Mairie (vérification du rôle par l'appelant).
 */
export async function saveFiscalConfig(config: Partial<FiscalConfig>): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Non authentifié" };

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'mairie' && profile?.role !== 'super_admin') {
            return { success: false, error: "Seule la Mairie peut modifier les paramètres fiscaux." };
        }

        const upserts: { key: string; value: string; updated_by: string; updated_at: string }[] = [];

        if (config.commissionRate !== undefined) {
            upserts.push({ key: 'commission_rate', value: String(config.commissionRate), updated_by: user.id, updated_at: new Date().toISOString() });
        }
        if (config.ecoTaxRate !== undefined) {
            upserts.push({ key: 'eco_tax_rate', value: String(config.ecoTaxRate), updated_by: user.id, updated_at: new Date().toISOString() });
        }

        if (upserts.length === 0) return { success: true };

        const { error } = await supabase.from('platform_settings').upsert(upserts, { onConflict: 'key' });
        if (error) throw error;

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
