"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Trash2, Map, Wallet, UserCircle, MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadBadges } from "@/hooks/useUnreadBadges";

export function BottomNavigation() {
    const pathname = usePathname();
    const { unreadMessages } = useUnreadBadges();

    const links = [
        { href: "/dashboard", label: "Accueil", icon: Building2 },
        { href: "/marketplace", label: "Marché", icon: Map },
        { href: "/chat", label: "Messages", icon: MessageSquare, badge: unreadMessages },
        { href: "/profil", label: "Profil", icon: UserCircle },
    ];

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 dark:bg-zinc-950 dark:border-zinc-800 md:hidden pb-safe">
            <div className="flex h-full max-w-lg mx-auto overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/");

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex flex-col items-center justify-center min-w-[72px] shrink-0 snap-center group px-1",
                                isActive ? "text-primary" : "text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                            )}
                        >
                            <div
                                className={cn(
                                    "p-1.5 rounded-full transition-all duration-200 relative",
                                    isActive ? "bg-primary/10" : "group-hover:bg-gray-100 dark:group-hover:bg-zinc-800"
                                )}
                            >
                                <Icon className={cn("w-6 h-6", isActive && "fill-primary/20")} strokeWidth={isActive ? 2.5 : 2} />
                                {link.badge ? (
                                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] text-[9px] font-black text-white bg-red-500 rounded-full px-1 shadow-sm shadow-red-500/20 border-2 border-white dark:border-zinc-950">
                                        {link.badge > 99 ? '99+' : link.badge}
                                    </span>
                                ) : null}
                            </div>
                            <span className="text-[10px] mt-0.5 font-medium">{link.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
