-- 🚀 RPC: Finalisation de la collecte avec mise à jour financière automatique
-- Cette fonction centralise la logique de paiement, transactions et taxes urbaines.

CREATE OR REPLACE FUNCTION public.fn_finalize_collection(
    p_waste_id UUID,
    p_final_weight DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_waste RECORD;
    v_seller_profile RECORD;
    v_collector_profile RECORD;
    v_mairie_profile RECORD;
    v_price_per_kg DECIMAL;
    v_total_amount DECIMAL;
    v_commission DECIMAL;
    v_seller_amount DECIMAL;
    v_eco_tax DECIMAL;
    v_mairie_id UUID;
BEGIN
    -- 1. Récupération des détails du lot et du type
    SELECT w.*, wt.price_per_kg, wt.name as waste_name
    INTO v_waste
    FROM public.wastes w
    JOIN public.waste_types wt ON w.type_id = wt.id
    WHERE w.id = p_waste_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lot introuvable');
    END IF;

    IF v_waste.status = 'collected' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ce lot a déjà été collecté');
    END IF;

    -- 2. Calculs financiers (Marketplace uniquement pour l'instant)
    v_price_per_kg := v_waste.price_per_kg;
    v_total_amount := p_final_weight * v_price_per_kg;
    v_commission := v_total_amount * 0.10; -- 10% frais plateforme
    v_seller_amount := v_total_amount - v_commission;
    v_eco_tax := v_total_amount * 0.02; -- 2% taxe Mairie

    -- 3. Mise à jour du lot
    UPDATE public.wastes
    SET status = 'collected',
        final_weight = p_final_weight,
        collected_at = now()
    WHERE id = p_waste_id;

    -- 4. Flux financier (Si c'est un marketplace ou avec prix)
    IF v_total_amount > 0 AND v_waste.seller_id IS NOT NULL AND v_waste.collector_id IS NOT NULL THEN
        
        -- Crédit Vendeur
        UPDATE public.profiles
        SET wallet_balance = wallet_balance + v_seller_amount,
            eco_points = eco_points + floor(p_final_weight)::int
        WHERE id = v_waste.seller_id;

        -- Débit Collecteur (ou l'entité qui paie)
        UPDATE public.profiles
        SET wallet_balance = wallet_balance - v_total_amount
        WHERE id = v_waste.collector_id;

        -- Recherche de la Mairie locale (super_admin ou mairie de la zone)
        SELECT id INTO v_mairie_id FROM public.profiles WHERE role = 'mairie' OR role = 'super_admin' LIMIT 1;
        
        IF v_mairie_id IS NOT NULL THEN
            UPDATE public.profiles
            SET wallet_balance = wallet_balance + v_eco_tax
            WHERE id = v_mairie_id;
        END IF;

        -- 5. Journalisation des Transactions
        INSERT INTO public.transactions (profile_id, amount, type, description)
        VALUES 
            (v_waste.seller_id, v_seller_amount, 'income', 'Vente de ' || p_final_weight || 'kg de ' || v_waste.waste_name),
            (v_waste.collector_id, -v_total_amount, 'outcome', 'Achat de ' || p_final_weight || 'kg de ' || v_waste.waste_name);
        
        IF v_mairie_id IS NOT NULL THEN
            INSERT INTO public.transactions (profile_id, amount, type, description)
            VALUES (v_mairie_id, v_eco_tax, 'income', 'Eco-taxe sur lot #' || split_part(p_waste_id::text, '-', 1));
        END IF;

        -- 6. Notifications DB
        INSERT INTO public.notifications (profile_id, title, content, type)
        VALUES 
            (v_waste.seller_id, 'Paiement Reçu !', 'Votre vente est validée. +' || v_seller_amount || ' FCFA.', 'payment'),
            (v_waste.collector_id, 'Collecte Terminée', 'Vous avez finalisé la collecte de ' || p_final_weight || 'kg.', 'collection');

    END IF;

    RETURN jsonb_build_object('success', true, 'total_amount', v_total_amount);
END;
$$;
