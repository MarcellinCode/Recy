"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Trash2, Map, Wallet, UserCircle, MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
    const pathname = usePathname();

    const links = [
        { href: "/mes-dechets", label: "Déchets", icon: Trash2 },
        { href: "/marketplace", label: "Marché", icon: Map },
        { href: "/appels-offres", label: "B2B", icon: Building2 },
        { href: "/carte", label: "Carte", icon: MapPin },
        { href: "/chat", label: "Messages", icon: MessageSquare },
        { href: "/wallet", label: "Wallet", icon: Wallet },
        { href: "/profil", label: "Profil", icon: UserCircle },
    ];

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 dark:bg-zinc-950 dark:border-zinc-800 md:hidden pb-safe">
            <div className="grid h-full max-w-lg grid-cols-7 mx-auto font-medium">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/");

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "inline-flex flex-col items-center justify-center px-1 lg:px-5 group",
                                isActive ? "text-primary" : "text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                            )}
                        >
                            <div
                                className={cn(
                                    "p-1.5 rounded-full transition-all duration-200",
                                    isActive ? "bg-primary/10" : "group-hover:bg-gray-100 dark:group-hover:bg-zinc-800"
                                )}
                            >
                                <Icon className={cn("w-6 h-6", isActive && "fill-primary/20")} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[10px] mt-0.5 font-medium">{link.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
