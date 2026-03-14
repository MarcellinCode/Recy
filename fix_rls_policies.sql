-- 🚨 CORRECTIF SQL (Version Simplifiée)
-- Ce script autorise le marquage des messages comme "lus" dans Supabase.

-- 1. Autoriser le marquage des messages comme "lus"
DROP POLICY IF EXISTS "Users can update their own received messages" ON public.messages;
CREATE POLICY "Users can update their own received messages" ON public.messages
FOR UPDATE USING (auth.uid() = receiver_id);

-- 2. Autoriser le marquage des notifications comme "lus"
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = profile_id);
