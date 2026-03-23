"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, X, Leaf, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useUnreadBadges } from "@/hooks/useUnreadBadges";

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { unreadMessages, unreadNotifications } = useUnreadBadges();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();
                setRole(profile?.role ?? null);
            }
            setLoading(false);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/connexion");
        router.refresh();
    };

    const roleLinks: Record<string, { href: string; label: string; badge?: number }[]> = {
        vendeur: [
            { href: "/dashboard",   label: "Hub" },
            { href: "/marketplace", label: "Marché" },
            { href: "/mes-dechets", label: "Mes Lots" },
            { href: "/chat",        label: "Messages", badge: unreadMessages },
        ],
        collecteur: [
            { href: "/dashboard",   label: "Hub" },
            { href: "/marketplace", label: "Marché" },
            { href: "/appels-offres", label: "B2B" },
            { href: "/chat",        label: "Messages", badge: unreadMessages },
        ],
        agent_collecteur: [
            { href: "/dashboard",   label: "Hub" },
            { href: "/chat",        label: "Messages", badge: unreadMessages },
        ],
        entreprise: [
            { href: "/dashboard",          label: "Hub" },
            { href: "/admin/organisation", label: "Ma Flotte" },
            { href: "/appels-offres",      label: "B2B" },
            { href: "/chat",               label: "Messages", badge: unreadMessages },
        ],
        organisation_admin: [
            { href: "/dashboard",          label: "Hub" },
            { href: "/admin/organisation", label: "Ma Flotte" },
            { href: "/appels-offres",      label: "B2B" },
            { href: "/chat",               label: "Messages", badge: unreadMessages },
        ],
        mairie: [
            { href: "/dashboard",    label: "Hub" },
            { href: "/admin/mairie", label: "City OS" },
            { href: "/chat",         label: "Messages", badge: unreadMessages },
        ],
    };

    const desktopLinks = user
        ? (role ? roleLinks[role] : roleLinks.vendeur) ?? roleLinks.vendeur
        : [
            { href: "/#features", label: "Fonctionnalités" },
            { href: "/#impact",   label: "Notre Impact" },
          ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
            <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white text-primary group-hover:scale-105 transition-all shadow-md overflow-hidden">
                        <img src="/logo.png" alt="CITICLINE Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xl sm:text-3xl font-black tracking-tighter text-gray-900 dark:text-white uppercase italic leading-none">
                        CITI<span className="text-primary tracking-tighter">CLINE</span>
                    </span>
                </Link>

                {/* Navigation Desktop */}
                <nav className="hidden md:flex items-center gap-8">
                    {desktopLinks.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "text-sm font-bold uppercase tracking-widest transition-colors hover:text-primary relative flex items-center gap-1.5",
                                    isActive ? "text-primary" : "text-gray-500 dark:text-gray-400"
                                )}
                            >
                                {link.label}
                                {link.badge ? (
                                    <span className="flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-black text-white bg-red-500 rounded-full px-1 shadow-sm shadow-red-500/20">
                                        {link.badge > 99 ? '99+' : link.badge}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {!loading && user && (
                        <Link href="/notifications" className="p-2 text-gray-500 transition-colors rounded-full relative group hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800">
                            <Bell className="w-5 h-5 group-hover:text-primary transition-colors" />
                            {unreadNotifications > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-950 shadow-sm shadow-red-500/20"></span>
                            )}
                        </Link>
                    )}

                    {!loading && (
                        user ? (
                            <div className="hidden md:flex items-center gap-3">
                                <Link
                                    href="/profil"
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-all dark:bg-zinc-800 dark:text-gray-200"
                                >
                                    <UserIcon className="w-4 h-4" />
                                    {user.user_metadata?.full_name?.split(' ')[0] || "Profil"}
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors dark:hover:bg-red-950/30"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <Link
                                href="/connexion"
                                className="px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-white transition-all rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95"
                            >
                                <span className="hidden xs:inline">Connexion</span>
                                <span className="xs:hidden">Login</span>
                            </Link>
                        )
                    )}

                    {/* Menu Mobile */}
                    <button
                        className="p-2 text-gray-500 md:hidden hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Menu Mobile déroulant */}
            {isMobileMenuOpen && (
                <div className="border-t border-gray-100 md:hidden dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4">
                    {!user ? (
                        <>
                            <Link href="/connexion" className="block w-full px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-white rounded-2xl bg-primary">
                                Se connecter
                            </Link>
                            <Link href="/inscription" className="block w-full px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-gray-700 bg-gray-100 rounded-2xl">
                                Créer un compte
                            </Link>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl mb-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {user.user_metadata?.full_name?.[0] || "U"}
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{user.user_metadata?.full_name || "Utilisateur"}</p>
                                    <p className="text-[10px] text-gray-500">{user.email}</p>
                                </div>
                            </div>
                            <nav className="space-y-2">
                                {desktopLinks.map(link => (
                                    <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between p-3 font-bold text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl transition-colors">
                                        {link.label}
                                        {link.badge ? (
                                            <span className="flex items-center justify-center min-w-[20px] h-[20px] text-[10px] font-black text-white bg-red-500 rounded-full px-1.5 shadow-sm shadow-red-500/20">
                                                {link.badge > 99 ? '99+' : link.badge}
                                            </span>
                                        ) : null}
                                    </Link>
                                ))}
                            </nav>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold text-sm bg-red-50 dark:bg-red-950/20 rounded-2xl"
                            >
                                <LogOut className="w-4 h-4" />
                                Déconnexion
                            </button>
                        </>
                    )}
                </div>
            )}
        </header>
    );
}
