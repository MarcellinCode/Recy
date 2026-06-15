-- Trigger pour résoudre automatiquement l'infraction associée lorsqu'une mission de nettoyage est terminée
CREATE OR REPLACE FUNCTION public.fn_auto_resolve_infraction_on_collect()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la mission est terminée (status = 'collected') et qu'il s'agit d'une mission de nettoyage d'infraction
    IF NEW.status = 'collected' AND OLD.status != 'collected' AND NEW.mission_type = 'infraction_cleanup' THEN
        -- Rechercher l'infraction correspondante aux mêmes coordonnées GPS
        -- et qui est en cours d'investigation
        UPDATE public.environmental_infractions
        SET status = 'resolved',
            resolved_at = NOW()
        WHERE latitude = NEW.latitude 
          AND longitude = NEW.longitude 
          AND status = 'investigating';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_resolve_infraction_on_collect ON public.wastes;
CREATE TRIGGER tr_auto_resolve_infraction_on_collect
AFTER UPDATE OF status ON public.wastes
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_resolve_infraction_on_collect();
