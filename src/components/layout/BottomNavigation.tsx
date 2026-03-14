"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Trash2, Map, Wallet, UserCircle, MapPin, Building2 } from "lucide-react";
import { motion } from "framer-motion";
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg md:hidden">
            <nav className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border border-white/20 dark:border-zinc-800 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] rounded-[2rem] px-4 py-2 flex items-center justify-between pointer-events-auto">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/");

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300",
                                isActive ? "text-primary" : "text-zinc-400 hover:text-primary/70"
                            )}
                        >
                            <div className="relative">
                                <Icon 
                                    className={cn(
                                        "w-6 h-6 transition-all duration-300",
                                        isActive ? "scale-110" : "scale-100"
                                    )} 
                                    strokeWidth={isActive ? 2.5 : 2} 
                                />
                                {link.badge ? (
                                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] text-[9px] font-black text-white bg-red-500 rounded-full border-2 border-white dark:border-zinc-950 shadow-lg">
                                        {link.badge > 99 ? '99+' : link.badge}
                                    </span>
                                ) : null}
                            </div>
                            
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest mt-1 transition-all duration-300",
                                isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                            )}>
                                {link.label}
                            </span>

                            {isActive && (
                                <motion.div 
                                    layoutId="nav-pill"
                                    className="absolute inset-0 bg-primary/5 rounded-2xl -z-10"
                                    transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
