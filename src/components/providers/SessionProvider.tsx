"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";

/**
 * Source UNIQUE de la session côté navigateur.
 *
 * Avant : Header, NavigationWrapper, le tableau de bord (et d'autres) faisaient
 * chacun leur propre getUser() réseau + lecture du rôle + 3 à 4 canaux Realtime
 * (dont un sur TOUTE la table wastes, déclenché par n'importe quel lot de la
 * plateforme), et NavigationWrapper se réabonnait à chaque changement de page.
 *
 * Maintenant : 1 lecture de session locale, 1 lecture du profil, 1 canal
 * Realtime filtré sur l'utilisateur, compteurs partagés par tous les composants.
 */

export type SessionProfile = {
    id: string;
    role: string | null;
    full_name: string | null;
    status: string | null;
};

type SessionState = {
    userId: string | null;
    email: string | null;
    role: string | null;
    profile: SessionProfile | null;
    loading: boolean;
    unreadMessages: number;
    unreadNotifications: number;
    unreadReservations: number;
    refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

const ROLE_STORAGE_KEY = "user-role";

function readCachedRole(): string | null {
    try {
        return globalThis.localStorage?.getItem(ROLE_STORAGE_KEY) ?? null;
    } catch {
        return null;
    }
}

function writeCachedRole(role: string | null) {
    try {
        if (role) globalThis.localStorage?.setItem(ROLE_STORAGE_KEY, role);
        else globalThis.localStorage?.removeItem(ROLE_STORAGE_KEY);
    } catch {
        /* stockage indisponible : sans conséquence */
    }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const pathname = usePathname();
    const pathnameRef = useRef(pathname);
    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    const [userId, setUserId] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [profile, setProfile] = useState<SessionProfile | null>(null);
    const [cachedRole, setCachedRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadReservations, setUnreadReservations] = useState(0);

    const fetchCounts = useCallback(async (uid: string) => {
        const [messagesRes, notificationsRes, wastesRes] = await Promise.all([
            supabase
                .from("messages")
                .select("id", { count: "exact", head: true })
                .eq("receiver_id", uid)
                .eq("is_read", false)
                .not("waste_id", "is", null),
            supabase
                .from("notifications")
                .select("id", { count: "exact", head: true })
                .eq("profile_id", uid)
                .eq("is_read", false),
            supabase
                .from("wastes")
                .select("id", { count: "exact", head: true })
                .eq("status", "reserved")
                .or(`seller_id.eq.${uid},collector_id.eq.${uid}`),
        ]);
        setUnreadMessages(messagesRes.count || 0);
        setUnreadNotifications(notificationsRes.count || 0);
        setUnreadReservations(wastesRes.count || 0);
    }, [supabase]);

    const loadUser = useCallback(async (uid: string | null, mail: string | null) => {
        setUserId(uid);
        setEmail(mail);
        if (!uid) {
            setProfile(null);
            writeCachedRole(null);
            setCachedRole(null);
            setUnreadMessages(0);
            setUnreadNotifications(0);
            setUnreadReservations(0);
            setLoading(false);
            return;
        }
        const [{ data }] = await Promise.all([
            supabase.from("profiles").select("id, role, full_name, status").eq("id", uid).maybeSingle(),
            fetchCounts(uid),
        ]);
        setProfile((data as SessionProfile) || null);
        writeCachedRole(data?.role ?? null);
        setCachedRole(data?.role ?? null);
        setLoading(false);
    }, [supabase, fetchCounts]);

    // Session : lecture LOCALE (pas d'aller-retour réseau), puis écoute des changements
    useEffect(() => {
        let active = true;
        let currentUid: string | null = null;

        supabase.auth.getSession().then(({ data: { session } }: { data: { session: { user: { id: string; email?: string } } | null } }) => {
            if (!active) return;
            currentUid = session?.user?.id ?? null;
            // Rôle mis en cache : le bon menu s'affiche avant la lecture du profil
            if (currentUid) setCachedRole(readCachedRole());
            loadUser(currentUid, session?.user?.email ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event: string, session: { user: { id: string; email?: string } } | null) => {
                const nextUid = session?.user?.id ?? null;
                // Les rafraîchissements de jeton ne doivent rien recharger
                if (nextUid === currentUid) return;
                currentUid = nextUid;
                loadUser(nextUid, session?.user?.email ?? null);
            }
        );

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [supabase, loadUser]);

    // UN seul canal Realtime, filtré sur l'utilisateur
    useEffect(() => {
        if (!userId) return;

        let timer: ReturnType<typeof setTimeout> | null = null;
        const scheduleCounts = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fetchCounts(userId), 400);
        };

        const channel = supabase
            .channel(`session_${userId}`)
            .on("postgres_changes",
                { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
                async (payload: { new: { sender_id: string; content: string } }) => {
                    scheduleCounts();
                    if (pathnameRef.current?.includes("/chat")) return;
                    const { data: sender } = await supabase
                        .from("profiles")
                        .select("full_name")
                        .eq("id", payload.new.sender_id)
                        .maybeSingle();
                    const content = payload.new.content || "";
                    showToast(
                        `${sender?.full_name || "Nouveau message"}: ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`,
                        "info"
                    );
                })
            .on("postgres_changes",
                { event: "UPDATE", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
                scheduleCounts)
            .on("postgres_changes",
                { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${userId}` },
                (payload: { new: { title?: string; content?: string; type?: string } }) => {
                    scheduleCounts();
                    // Affichage instantané de TOUTE notification (missions, paiements, sanctions...)
                    const n = payload.new || {};
                    const type = n.type === "alert" || n.type === "sanction" ? "error"
                        : n.type === "success" || n.type === "payment" ? "success" : "info";
                    showToast(`${n.title || "Notification"}${n.content ? " — " + n.content.substring(0, 90) : ""}`, type);
                })
            .on("postgres_changes",
                { event: "UPDATE", schema: "public", table: "notifications", filter: `profile_id=eq.${userId}` },
                scheduleCounts)
            .on("postgres_changes",
                { event: "*", schema: "public", table: "wastes", filter: `seller_id=eq.${userId}` },
                scheduleCounts)
            .on("postgres_changes",
                { event: "*", schema: "public", table: "wastes", filter: `collector_id=eq.${userId}` },
                scheduleCounts)
            .subscribe();

        return () => {
            if (timer) clearTimeout(timer);
            supabase.removeChannel(channel);
        };
    }, [supabase, userId, fetchCounts]);

    const refresh = useCallback(async () => {
        if (userId) await loadUser(userId, email);
    }, [userId, email, loadUser]);

    const value = useMemo<SessionState>(() => ({
        userId,
        email,
        role: profile?.role ?? (userId ? cachedRole : null),
        profile,
        loading,
        unreadMessages,
        unreadNotifications,
        unreadReservations,
        refresh,
    }), [userId, email, profile, cachedRole, loading, unreadMessages, unreadNotifications, unreadReservations, refresh]);

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
    const ctx = useContext(SessionContext);
    if (!ctx) {
        // Hors fournisseur (ex. pages admin isolées) : valeurs neutres
        return {
            userId: null, email: null, role: null, profile: null, loading: false,
            unreadMessages: 0, unreadNotifications: 0, unreadReservations: 0,
            refresh: async () => {},
        };
    }
    return ctx;
}
