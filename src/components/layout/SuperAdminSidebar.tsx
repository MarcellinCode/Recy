"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    Users, 
    Building2, 
    Settings, 
    ShieldCheck, 
    LogOut,
    Menu,
    X,
    TrendingUp,
    ShieldAlert,
    Activity,
    Landmark
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { href: "/admin", label: "Tableau de Bord", icon: LayoutDashboard },
    { href: "/admin/organizations", label: "Organisations", icon: Building2 },
    { href: "/admin/add-mairie", label: "Ajouter Mairie", icon: Landmark },
    { href: "/admin/users", label: "Utilisateurs", icon: Users },
    { href: "/admin/subscriptions", label: "Abonnements", icon: Activity },
    { href: "/admin/finance", label: "Finances", icon: TrendingUp },
    { href: "/admin/waste", label: "Gestion Déchets", icon: ShieldAlert },
    { href: "/admin/settings", label: "Configuration", icon: Settings },
];

export function SuperAdminSidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Toggle */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed bottom-24 right-6 z-50 w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-90"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed left-0 top-0 h-full bg-white dark:bg-zinc-950 border-r border-gray-100 dark:border-zinc-800 transition-all duration-300 z-40",
                "w-72 lg:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full p-8">
                    {/* Header */}
                    <div className="mb-12">
                        <Link href="/admin" className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
                                    SUPER <span className="text-primary italic">ADMIN</span>
                                </h1>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">CleanZone Global HQ</p>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                                        isActive 
                                            ? "bg-gray-900 text-white shadow-xl shadow-gray-900/20 translate-x-2" 
                                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-900"
                                    )}
                                >
                                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className={cn(
                                        "text-xs font-black uppercase tracking-widest",
                                        isActive ? "opacity-100" : "opacity-60"
                                    )}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="pt-8 border-t border-gray-100 dark:border-zinc-800">
                        <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-2xl mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <ShieldAlert size={16} className="text-amber-500" />
                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Alerte Système</span>
                            </div>
                            <p className="text-[9px] font-bold text-amber-950/60 dark:text-amber-200/40 leading-relaxed uppercase tracking-tight">
                                2 nouvelles demandes de mairies en attente de validation.
                            </p>
                        </div>

                        <button className="flex items-center gap-4 px-6 py-4 w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl transition-all group">
                            <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-widest">Déconnexion</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
