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

  -- 3. Mettre à jour le solde
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_new_balance;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Solde insuffisant';
  END IF;

  -- 4. Journaliser dans la table transactions
  INSERT INTO public.transactions (profile_id, amount, type, description, status)
  VALUES (p_user_id, p_amount, p_operation_type, v_desc, 'Succeeded');

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 🛡️ Trigger de protection des colonnes sensibles sur profiles
CREATE OR REPLACE FUNCTION public.fn_protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Permettre aux rôles système de tout modifier sans restriction (comme postgres pour les RPC)
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- 2. Restreindre la modification directe de wallet_balance par les clients
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'Interdit : Modification directe du solde non autorisée. Utilisez l''API officielle.';
  END IF;

  -- 3. Restreindre la modification directe de eco_points par les clients
  IF NEW.eco_points IS DISTINCT FROM OLD.eco_points THEN
    RAISE EXCEPTION 'Interdit : Modification directe des points éco non autorisée.';
  END IF;

  -- 4. Restreindre la modification directe du rôle par les clients
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Interdit : Modification directe du rôle non autorisée.';
  END IF;

  -- 5. Restreindre la modification directe du statut par les clients
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
