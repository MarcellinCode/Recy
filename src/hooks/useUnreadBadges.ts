"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function useUnreadBadges() {
    const pathname = usePathname();
    const supabase = createClient();
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    // Reset unread messages badge locally when on the chat page
    const effectiveUnreadMessages = pathname?.startsWith("/chat") ? 0 : unreadMessages;

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let messagesCurrentChannel: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let notificationsCurrentChannel: any;

        const setupSubscriptions = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setUnreadMessages(0);
                setUnreadNotifications(0);
                return;
            }

            // Fetch initial counts
            const fetchCounts = async () => {
                const [messagesRes, notificationsRes] = await Promise.all([
                    supabase
                        .from('messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('receiver_id', user.id)
                        .eq('is_read', false),
                    supabase
                        .from('notifications')
                        .select('id', { count: 'exact', head: true })
                        .eq('profile_id', user.id)
                        .eq('is_read', false)
                ]);

                console.log("BADGE DEBUG:", {
                    messagesCount: messagesRes.count,
                    messagesError: messagesRes.error,
                    notifCount: notificationsRes.count,
                    notifError: notificationsRes.error
                });

                setUnreadMessages(messagesRes.count || 0);
                setUnreadNotifications(notificationsRes.count || 0);
            };

            await fetchCounts();

            // Setup Realtime channels with unique names to avoid React strict mode multi-mount collisions
            const uniqueId = Math.random().toString(36).substring(7);
            
            messagesCurrentChannel = supabase
                .channel(`messages_badge_${user.id}_${uniqueId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'messages'
                    },
                    (payload) => {
                        console.log("REALTIME MESSAGE EVENT:", payload);
                        fetchCounts();
                    }
                );

            messagesCurrentChannel.subscribe((status: string) => {
                console.log(`MESSAGES REALTIME STATUS: ${status}`);
            });

            notificationsCurrentChannel = supabase
                .channel(`notifications_badge_${user.id}_${uniqueId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notifications'
                    },
                    (payload) => {
                        console.log("REALTIME NOTIFICATION EVENT:", payload);
                        fetchCounts();
                    }
                );

            notificationsCurrentChannel.subscribe((status: string) => {
                console.log(`NOTIFICATIONS REALTIME STATUS: ${status}`);
            });
        };

        setupSubscriptions();

        const { data: authStateListener } = supabase.auth.onAuthStateChange(() => {
            // Re-setup on login/logout
            setupSubscriptions();
        });

        return () => {
            authStateListener?.subscription.unsubscribe();
            if (messagesCurrentChannel) supabase.removeChannel(messagesCurrentChannel);
            if (notificationsCurrentChannel) supabase.removeChannel(notificationsCurrentChannel);
        };
    }, [supabase]);

    return { unreadMessages: effectiveUnreadMessages, unreadNotifications };
}
