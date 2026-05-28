"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function useUnreadBadges() {
    const pathname = usePathname();
    const supabase = createClient();
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadReservations, setUnreadReservations] = useState(0);

    // Force-clear unread messages badge locally when on any chat-related path
    const isChatPath = pathname?.includes("/chat");
    const effectiveUnreadMessages = isChatPath ? 0 : unreadMessages;

    useEffect(() => {
        if (isChatPath) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUnreadMessages(0);
        }
    }, [isChatPath, pathname]);

    useEffect(() => {
        let active = true;
        // Keep track of channels to clean them up reliably
        const channels: any[] = [];

        const setupSubscriptions = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!active) return;
            
            if (!user) {
                setUnreadMessages(0);
                setUnreadNotifications(0);
                setUnreadReservations(0);
                return;
            }

            // Fetch initial counts
            const fetchCounts = async () => {
                if (!active) return;
                const [messagesRes, notificationsRes, wastesRes] = await Promise.all([
                    supabase
                        .from('messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('receiver_id', user.id)
                        .eq('is_read', false)
                        .not('waste_id', 'is', null),
                    supabase
                        .from('notifications')
                        .select('id', { count: 'exact', head: true })
                        .eq('profile_id', user.id)
                        .eq('is_read', false),
                    supabase
                        .from('wastes')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'reserved')
                        .or(`seller_id.eq.${user.id},collector_id.eq.${user.id}`)
                ]);

                if (active) {
                    setUnreadMessages(isChatPath ? 0 : (messagesRes.count || 0));
                    setUnreadNotifications(notificationsRes.count || 0);
                    setUnreadReservations(wastesRes.count || 0);
                }
            };

            await fetchCounts();

            if (!active) return;

            // Setup Realtime channels
            const uniqueId = Math.random().toString(36).substring(7);
            
            const msgChannel = supabase
                .channel(`messages_badge_${user.id}_${uniqueId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchCounts)
                .subscribe();

            const notifChannel = supabase
                .channel(`notifications_badge_${user.id}_${uniqueId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchCounts)
                .subscribe();

            const wasteChannel = supabase
                .channel(`wastes_badge_${user.id}_${uniqueId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'wastes' }, fetchCounts)
                .subscribe();

            channels.push(msgChannel, notifChannel, wasteChannel);
        };

        setupSubscriptions();

        const { data: authStateListener } = supabase.auth.onAuthStateChange(() => {
            // Cleanup previous channels before rebuilding subscriptions
            channels.forEach(ch => supabase.removeChannel(ch));
            channels.length = 0;
            setupSubscriptions();
        });

        return () => {
            active = false;
            authStateListener?.subscription.unsubscribe();
            channels.forEach(ch => supabase.removeChannel(ch));
        };
    }, [isChatPath]);

    return { unreadMessages: effectiveUnreadMessages, unreadNotifications, unreadReservations };
}
