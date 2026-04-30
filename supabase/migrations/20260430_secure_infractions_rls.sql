-- 🛡️ PATCH DE SÉCURITÉ CRITIQUE : environmental_infractions
-- Résolution de la faille IDOR et restriction territoriale (Police Verte)

-- 1. Nettoyage des anciennes politiques permissives
DROP POLICY IF EXISTS "Authenticated users can report infractions" ON public.environmental_infractions;
DROP POLICY IF EXISTS "Agents can insert infractions" ON public.environmental_infractions;

-- 2. Nouvelle politique d'insertion pour tous les utilisateurs (Citoyens)
-- Vérifie stricte de l'identité : On ne peut insérer qu'un PV à son PROPRE nom.
CREATE POLICY "Strict insert for users" 
ON public.environmental_infractions FOR INSERT 
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND reported_by = auth.uid()
);

-- 3. Fonction pour vérifier la zone d'un agent de la police verte
CREATE OR REPLACE FUNCTION public.fn_check_agent_zone(p_zone_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_agent_zone UUID;
BEGIN
    SELECT zone_id INTO v_agent_zone 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'agent_police_verte';

    -- Si c'est un agent, sa zone doit correspondre à celle de l'infraction
    IF v_agent_zone IS NOT NULL THEN
        RETURN v_agent_zone = p_zone_id;
    END IF;
    
    -- Si ce n'est pas un agent (ex: citoyen), on laisse passer la vérification de zone
    -- (Les citoyens peuvent signaler partout)
    RETURN TRUE; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Application de la contrainte territoriale via TRIGGER
-- On utilise un trigger pour forcer la vérification car les CHECK constraints sur RLS peuvent être contournées par les super-utilisateurs ou sont moins performantes avec des sous-requêtes complexes.
CREATE OR REPLACE FUNCTION public.fn_enforce_agent_territory()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_agent_zone UUID;
BEGIN
    SELECT role, zone_id INTO v_role, v_agent_zone 
    FROM public.profiles 
    WHERE id = NEW.reported_by;

    IF v_role = 'agent_police_verte' THEN
        IF v_agent_zone IS NULL OR v_agent_zone != NEW.zone_id THEN
            RAISE EXCEPTION 'Action bloquée (Zone Invalide) : Un agent de la Police Verte ne peut dresser un PV que dans sa propre juridiction territoriale.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enforce_agent_territory ON public.environmental_infractions;
CREATE TRIGGER tr_enforce_agent_territory
BEFORE INSERT OR UPDATE ON public.environmental_infractions
FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_agent_territory();
