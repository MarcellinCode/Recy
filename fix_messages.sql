-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- pour ajouter la colonne manquante `is_read` à la table `messages`.

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
