-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- pour activer Realtime sur la table messages et notifications.

-- 1. Activer Realtime pour la table messages
alter publication supabase_realtime add table messages;

-- 2. Activer Realtime pour la table notifications (utile pour les badges)
alter publication supabase_realtime add table notifications;
