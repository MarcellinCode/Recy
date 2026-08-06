-- 🛡️ RPC : Ajustement sécurisé du solde du portefeuille
CREATE OR REPLACE FUNCTION public.fn_adjust_wallet_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_operation_type TEXT
) RETURNS NUMERIC
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
  v_desc TEXT;
BEGIN
  -- 1. Vérifier que l'appelant est bien le propriétaire du compte ou un super_admin
  IF auth.uid() != p_user_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  -- 2. Définir la description de la transaction
  IF p_operation_type = 'credit' THEN
    v_desc := 'Recharge Portefeuille (Simulation)';
  ELSE
    v_desc := 'Paiement Service (Simulation)';
  END IF;

  -- 3. Positionner le flag de bypass pour cette transaction seulement
  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  -- 4. Mettre à jour le solde
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_new_balance;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Solde insuffisant';
  END IF;

  -- 5. Journaliser dans la table transactions (user_id)
  INSERT INTO public.transactions (user_id, amount, type, description, status)
  VALUES (p_user_id, p_amount, p_operation_type, v_desc, 'completed');

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 🛡️ RPC : Paiement d'abonnement sécurisé (Transfert entre Citoyen et Organisation)
CREATE OR REPLACE FUNCTION public.fn_pay_subscription(
  p_citizen_id UUID,
  p_org_id UUID,
  p_amount NUMERIC,
  p_org_name TEXT,
  p_user_name TEXT
) RETURNS NUMERIC
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_citizen_balance NUMERIC;
  v_new_org_balance NUMERIC;
BEGIN
  -- 1. Sécurité : vérifier que l'appelant est bien le citoyen concerné ou un super_admin
  IF auth.uid() != p_citizen_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  -- 2. Positionner le flag de bypass temporaire pour autoriser les modifications de solde
  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  -- 3. Débiter le citoyen
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_amount
  WHERE id = p_citizen_id
  RETURNING wallet_balance INTO v_new_citizen_balance;

  IF v_new_citizen_balance < 0 THEN
    RAISE EXCEPTION 'Solde insuffisant';
  END IF;

  -- 4. Créditer l'organisation
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE id = p_org_id
  RETURNING wallet_balance INTO v_new_org_balance;

  -- 5. Journaliser les transactions dans la table transactions pour les deux entités
  INSERT INTO public.transactions (user_id, amount, type, description, status)
  VALUES 
    (p_citizen_id, -p_amount, 'debit', 'Abonnement Service - ' || p_org_name, 'completed'),
    (p_org_id, p_amount, 'credit', 'Revenu Abonnement - ' || p_user_name, 'completed');

  RETURN v_new_citizen_balance;
END;
$$ LANGUAGE plpgsql;

-- 🛡️ Trigger de protection des colonnes sensibles sur profiles (sans SECURITY DEFINER pour respecter le rôle de l'invocateur)
CREATE OR REPLACE FUNCTION public.fn_protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Si le flag de bypass est positionné (mis par nos RPC sécurisées), on laisse passer
  IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- 2. Permettre aux rôles système de tout modifier sans restriction (lors de migrations directes via SQL editor)
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- 3. Restreindre la modification directe des colonnes sensibles par les clients
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'Interdit : Modification directe du solde non autorisée. Utilisez l''API officielle.';
  END IF;

  IF NEW.eco_points IS DISTINCT FROM OLD.eco_points THEN
    RAISE EXCEPTION 'Interdit : Modification directe des points éco non autorisée.';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Interdit : Modification directe du rôle non autorisée.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Interdit : Modification directe du statut non autorisée.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_columns ON public.profiles;
CREATE TRIGGER tr_protect_profile_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_protect_profile_columns();
