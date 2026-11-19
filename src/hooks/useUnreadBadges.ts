"use client";

import { usePathname } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";

/**
 * Compteurs de badges partagés (messages, notifications, réservations).
 * Ne crée plus aucune requête ni canal Realtime : tout vient du SessionProvider.
 */
export function useUnreadBadges() {
    const pathname = usePathname();
    const { unreadMessages, unreadNotifications, unreadReservations } = useSession();
    const isChatPath = pathname?.includes("/chat");

    return {
        unreadMessages: isChatPath ? 0 : unreadMessages,
        unreadNotifications,
        unreadReservations,
    };
}
