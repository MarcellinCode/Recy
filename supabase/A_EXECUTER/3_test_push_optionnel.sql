-- =====================================================================
-- 3) TEST DES NOTIFICATIONS PUSH EXPO — optionnel, après le fichier 2
-- ---------------------------------------------------------------------
-- Aucune configuration n'est nécessaire : la base appelle directement
-- le service Expo Push (https://exp.host).
--
-- Prérequis du test : se connecter une fois à l'application mobile
-- (build EAS sur un vrai téléphone) pour que son jeton soit enregistré.
-- =====================================================================

-- 1. Appareils enregistrés (doit afficher au moins une ligne)
SELECT p.full_name, p.role, s.token, s.user_agent, s.last_seen_at
FROM public.push_subscriptions s
JOIN public.profiles p ON p.id = s.user_id
ORDER BY s.last_seen_at DESC
LIMIT 20;

-- 2. Envoyer une notification de test : remplacez l'email puis exécutez
INSERT INTO public.notifications (profile_id, title, content, type)
SELECT u.id, '🔔 Test CleanZone', 'Les notifications push Expo fonctionnent !', 'info'
FROM auth.users u
WHERE u.email = 'remplacer-par-votre-email@exemple.com';

-- 3. Réponse d'Expo (quelques secondes après l'étape 2)
--    status_code 200 + "status":"ok" = envoyé ; "DeviceNotRegistered" = jeton périmé
SELECT id, status_code, content::text AS reponse_expo, created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;

-- (Optionnel) Si la « sécurité renforcée des push » est activée sur expo.dev :
-- UPDATE public.platform_settings SET value = '<EXPO_ACCESS_TOKEN>' WHERE key = 'expo_access_token';
