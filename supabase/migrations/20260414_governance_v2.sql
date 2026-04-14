-- 🏗️ CITY OS 2.0 : GOUVERNANCE RÉELLE

-- 1. Ajout du score de performance aux organisations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS performance_score DECIMAL(3,2) DEFAULT 5.0;

-- 2. Fonction pour débiter une sanction du wallet de l'organisation
CREATE OR REPLACE FUNCTION public.fn_apply_sanction_penalty(
    p_organization_id UUID,
    p_amount DECIMAL,
    p_description TEXT
) RETURNS VOID AS $$
BEGIN
    -- Insérer la transaction de débit
    INSERT INTO public.transactions (profile_id, amount, type, description)
    VALUES (p_organization_id, -p_amount, 'outcome', 'AMENDE : ' || p_description);
    
    -- Optionnel: On pourrait aussi soustraire du solde si on avait un champ 'balance' 
    -- mais RecyCla utilise l'agrégation des transactions pour le solde.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
