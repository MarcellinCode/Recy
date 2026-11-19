"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, X, LogOut, User as UserIcon, School, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/components/providers/SessionProvider";
import { useUnreadBadges } from "@/hooks/useUnreadBadges";

function getRoleLinks(unreadMessages: number): Record<string, { href: string; label: string; badge?: number }[]> {
    return {
        producteur: [
            { href: "/dashboard",   label: "Hub" },
            { href: "/marketplace", label: "Marché" },
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
        organisation_admin: [
            { href: "/dashboard",    label: "Hub" },
            { href: "/marketplace",  label: "Marché" },
            { href: "/mes-dechets",  label: "Mes Lots" },
            { href: "/chat",         label: "Messages", badge: unreadMessages },
        ],
        mairie: [
            { href: "/dashboard",    label: "Hub" },
            { href: "/city-os",      label: "City OS" },
            { href: "/chat",         label: "Messages", badge: unreadMessages },
        ],
        agent_police_verte: [
            { href: "/dashboard",    label: "Hub" },
            { href: "/carte",        label: "Carte" },
            { href: "/chat",         label: "Messages", badge: unreadMessages },
        ],
        super_admin: [
            { href: "/dashboard",    label: "Hub" },
            { href: "/admin",        label: "Admin" },
            { href: "/marketplace",  label: "Marché" },
            { href: "/chat",         label: "Messages", badge: unreadMessages },
        ],
    };
}

function safeGetRole(): string | null {
    if (typeof globalThis.window !== 'undefined') {
        return globalThis.localStorage.getItem('user-role');
    }
    return null;
}

function safeSetRole(newRole: string | null) {
    if (typeof globalThis.window !== 'undefined') {
        if (newRole) {
            globalThis.localStorage.setItem('user-role', newRole);
        } else {
            globalThis.localStorage.removeItem('user-role');
        }
    }
}


function renderRoleIcon(role: string | null) {
    if (role === 'mairie') {
        return <School className="w-4 h-4 text-emerald-500" />;
    }
    if (role === 'organisation_admin') {
        return <Building2 className="w-4 h-4 text-indigo-400" />;
    }
    if (role === 'agent_police_verte') {
        return <img src="/images/police_verte_logo.png" alt="Police Verte" className="w-4 h-4 object-contain" />;
    }
    return <UserIcon className="w-4 h-4" />;
}

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { unreadMessages, unreadNotifications } = useUnreadBadges();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    // Session, rôle et nom viennent du SessionProvider (aucune requête ici)
    const session = useSession();
    const role = session.role;
    const displayName = session.profile?.full_name || "";
    const user = session.userId
        ? { email: session.email, user_metadata: { full_name: displayName } }
        : null;

    const handleLogout = async () => {
        // 1. Close mobile menu instantly
        setIsMobileMenuOpen(false);

        // 2. Trigger network logout in the background without blocking the client redirect
        supabase.auth.signOut().catch((e: unknown) => {
            console.error("SignOut background error:", e);
        });
        
        // 3. Clear local storage and reset all states immediately
        safeSetRole(null);
        if (typeof globalThis.window !== 'undefined') {
            globalThis.localStorage.clear();
            
            // Clear Supabase session cookies to prevent middleware conflicts
            document.cookie.split(";").forEach((c) => {
                const eqPos = c.indexOf("=");
                const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
                if (name.includes("sb-") || name.includes("supabase")) {
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                }
            });
        }
        
        // 4. Redirect instantly to login page
        router.push("/connexion");
        router.refresh();
    };

    const links = getRoleLinks(unreadMessages);
    const desktopLinks = user
        ? (role ? links[role] : []) ?? []
        : [
            { href: "/#fonctionnement", label: "Comment ça marche" },
            { href: "/#profils",        label: "Pour qui ?" },
            { href: "/#marketplace",    label: "Marketplace" },
            { href: "/#mairies",        label: "Mairies" },
          ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between gap-4 px-6">

                {/* Logo */}
                <Link href="/" className="flex shrink-0 items-center gap-2.5 text-ink">
                    <img src="/logo-mark.png" alt="" className="h-9 w-9" />
                    <span className="text-xl font-extrabold tracking-[-0.02em]">CleanZone</span>
                </Link>

                {/* Navigation (ordinateur) */}
                <nav aria-label="Navigation principale" className="hidden items-center gap-7 md:flex">
                    {desktopLinks.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isActive ? "page" : undefined}
                                className={cn(
                                    "cz-link flex items-center gap-2 pb-0.5 text-[15px] font-medium",
                                    isActive ? "text-primary" : "text-[#2C3A31] hover:text-ink"
                                )}
                            >
                                {link.label}
                                {link.badge ? (
                                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D93025] px-1 text-[10px] font-bold text-white">
                                        {link.badge > 99 ? "99+" : link.badge}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {user && (
                        <Link href="/notifications" aria-label="Notifications" className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-ink transition-colors hover:border-brand">
                            <Bell className="h-5 w-5" />
                            {unreadNotifications > 0 && (
                                <span className="cz-live absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#D93025]" />
                            )}
                        </Link>
                    )}

                    {user ? (
                        <div className="hidden items-center gap-2 md:flex">
                            <Link
                                href="/profil"
                                className="flex h-11 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-brand"
                            >
                                {renderRoleIcon(role)}
                                {user.user_metadata?.full_name?.split(" ")[0] || "Profil"}
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                aria-label="Se déconnecter"
                                className="flex h-11 w-11 items-center justify-center rounded-full text-[#A1251B] transition-colors hover:bg-[#FCE8E6]"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="hidden items-center gap-1 sm:flex">
                            <Link href="/connexion" className="flex h-11 items-center rounded-full px-4 text-[15px] font-semibold text-ink">
                                Se connecter
                            </Link>
                            <Link href="/inscription" className="cz-btn flex h-11 items-center rounded-full bg-primary px-5 text-[15px] font-semibold text-white hover:bg-[#016B2F]">
                                Créer un compte
                            </Link>
                        </div>
                    )}

                    {/* Menu téléphone */}
                    <button
                        type="button"
                        aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                        aria-expanded={isMobileMenuOpen}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-ink md:hidden"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Menu déroulant téléphone */}
            {isMobileMenuOpen && (
                <div className="cz-in space-y-4 border-t border-border bg-white p-6 md:hidden">
                    {user ? (
                        <>
                            <div className="mb-2 flex items-center gap-3 rounded-2xl bg-background p-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F5EC] font-bold text-primary">
                                    {user.user_metadata?.full_name?.[0] || "U"}
                                </div>
                                <div>
                                    <p className="text-sm font-bold">{user.user_metadata?.full_name || "Utilisateur"}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                            <nav aria-label="Navigation principale" className="space-y-1">
                                {desktopLinks.map(link => (
                                    <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between rounded-xl p-3 text-[15px] font-semibold text-[#2C3A31] transition-colors hover:bg-background">
                                        {link.label}
                                        {link.badge ? (
                                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#D93025] px-1.5 text-[10px] font-bold text-white">
                                                {link.badge > 99 ? "99+" : link.badge}
                                            </span>
                                        ) : null}
                                    </Link>
                                ))}
                                <Link href="/profil" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center rounded-xl p-3 text-[15px] font-semibold text-[#2C3A31] transition-colors hover:bg-background">
                                    Mon profil
                                </Link>
                            </nav>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FCE8E6] p-3 text-sm font-bold text-[#A1251B]"
                            >
                                <LogOut className="h-4 w-4" />
                                Déconnexion
                            </button>
                        </>
                    ) : (
                        <>
                            <nav aria-label="Navigation principale" className="space-y-1">
                                {desktopLinks.map(link => (
                                    <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="block rounded-xl p-3 text-[15px] font-semibold text-[#2C3A31] hover:bg-background">
                                        {link.label}
                                    </Link>
                                ))}
                            </nav>
                            <Link href="/inscription" className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-white">
                                Créer un compte
                            </Link>
                            <Link href="/connexion" className="flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-ink text-[15px] font-semibold text-ink">
                                Se connecter
                            </Link>
                        </>
                    )}
                </div>
            )}
        </header>
    );
}
