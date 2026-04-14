-- 🔔 Triggers de Notifications Automatiques
-- Ce script assure que les agents et citoyens sont informés en temps réel des actions critiques.

-- 1. Fonction pour notifier l'assignation d'une mission
CREATE OR REPLACE FUNCTION public.fn_notify_mission_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- S'il y a un nouvel agent assigné
    IF (NEW.assigned_agent_id IS NOT NULL AND (OLD.assigned_agent_id IS NULL OR NEW.assigned_agent_id <> OLD.assigned_agent_id)) THEN
        INSERT INTO public.notifications (profile_id, title, content, type)
        VALUES (
            NEW.assigned_agent_id,
            'Nouvelle Mission 📋',
            'Une nouvelle mission de ' || NEW.mission_type || ' vous a été assignée.',
            'offer'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger sur la table wastes
DROP TRIGGER IF EXISTS tr_notify_mission_assignment ON public.wastes;
CREATE TRIGGER tr_notify_mission_assignment
    AFTER UPDATE OF assigned_agent_id ON public.wastes
    FOR EACH ROW EXECUTE FUNCTION public.fn_notify_mission_assignment();

-- 3. Fonction pour notifier le changement de statut d'un lot (pour le vendeur)
CREATE OR REPLACE FUNCTION public.fn_notify_waste_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status <> OLD.status) THEN
        IF (NEW.status = 'reserved') THEN
            INSERT INTO public.notifications (profile_id, title, content, type)
            VALUES (
                NEW.seller_id,
                'Lot Réservé 🤝',
                'Un collecteur a réservé votre lot. Préparez-vous pour la collecte !',
                'offer'
            );
        ELSIF (NEW.status = 'collected') THEN
            -- Déjà géré par l'RPC fn_finalize_collection, mais on le garde au cas où pour les mises à jour directes
            INSERT INTO public.notifications (profile_id, title, content, type)
            VALUES (
                NEW.seller_id,
                'Collecte Terminée ✅',
                'Votre lot a été collecté avec succès. Merci pour votre geste éco !',
                'payment'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger de statut sur wastes
DROP TRIGGER IF EXISTS tr_notify_waste_status_change ON public.wastes;
CREATE TRIGGER tr_notify_waste_status_change
    AFTER UPDATE OF status ON public.wastes
    FOR EACH ROW EXECUTE FUNCTION public.fn_notify_waste_status_change();
