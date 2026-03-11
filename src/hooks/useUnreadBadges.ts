"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

export function useUnreadBadges() {
    const supabase = createClient();
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    useEffect(() => {
        let authStateListener: { subscription: { unsubscribe: () => void } };
        let messagesCurrentChannel: any;
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

            // Setup Realtime channels
            messagesCurrentChannel = supabase
                .channel(`messages_badge_${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages'
                    },
                    (payload) => {
                        console.log("REALTIME MESSAGE RECEIVED:", payload);
                        if (payload.new.receiver_id === user.id) {
                            fetchCounts();
                        }
                    }
                );

            messagesCurrentChannel.subscribe((status: string) => {
                console.log(`MESSAGES REALTIME STATUS: ${status}`);
            });

            notificationsCurrentChannel = supabase
                .channel(`notifications_badge_${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications'
                    },
                    (payload) => {
                        console.log("REALTIME NOTIFICATION RECEIVED:", payload);
                        if (payload.new.profile_id === user.id) {
                            fetchCounts();
                        }
                    }
                );

            notificationsCurrentChannel.subscribe((status: string) => {
                console.log(`NOTIFICATIONS REALTIME STATUS: ${status}`);
            });
        };

        setupSubscriptions();

        const { data } = supabase.auth.onAuthStateChange(() => {
            // Re-setup on login/logout
            setupSubscriptions();
        });
        authStateListener = data;

        return () => {
            authStateListener?.subscription.unsubscribe();
            if (messagesCurrentChannel) supabase.removeChannel(messagesCurrentChannel);
            if (notificationsCurrentChannel) supabase.removeChannel(notificationsCurrentChannel);
        };
    }, [supabase]);

    return { unreadMessages, unreadNotifications };
}
