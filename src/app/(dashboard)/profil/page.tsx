"use client";

import { useState, useEffect } from "react";
import { UserCircle, Settings, LogOut, Shield, Bell, HelpCircle, ChevronRight, Loader2, Mail, MapPin, Leaf, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { navigateSafe } from "@/utils/navigation";
import { userService } from "@/services/userService";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const data = await userService.getCurrentProfile();
                if (!data) {
                    navigateSafe(router, ROUTES.CONNEXION);
                    return;
                }
                setProfile(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [router]);

    const handleLogout = async () => {
        await userService.signOut();
        router.refresh();
        navigateSafe(router, ROUTES.CONNEXION);
    };

    const baseMenuItems = [
        { icon: <UserCircle className="w-5 h-5 text-blue-500" />, label: "Informations personnelles", route: ROUTES.PROFILE_INFOS },
        { icon: <Shield className="w-5 h-5 text-green-500" />, label: "Sécurité & Mot de passe", route: ROUTES.PROFILE_SECURITY },
        { icon: <Bell className="w-5 h-5 text-amber-500" />, label: "Notifications", route: ROUTES.NOTIFICATIONS },
    ];

    const collectorMenuItems = (profile?.role === 'collecteur' || profile?.role === 'entreprise') ? [
        { icon: <Zap className="w-5 h-5 text-amber-500" />, label: "Forfaits & Abonnements", route: ROUTES.ABONNEMENTS },
    ] : [];

    const extraMenuItems = [
        { icon: <Settings className="w-5 h-5 text-gray-500" />, label: "Paramètres", route: ROUTES.PROFILE_SETTINGS },
        { icon: <HelpCircle className="w-5 h-5 text-purple-500" />, label: "Aide & Support", route: ROUTES.PROFILE_HELP },
    ];

    const menuItems = [...baseMenuItems, ...collectorMenuItems, ...extraMenuItems];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Ouverture de votre coffre-fort...</p>
            </div>
        );
    }

    const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || "??";

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-4 mb-12 tracking-tighter uppercase italic">
                <UserCircle className="w-10 h-10 text-primary" />
                Mon <span className="text-primary">Espace</span>
            </h1>

            {/* Profile Header */}
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border-2 border-gray-100 dark:border-zinc-800 shadow-xl mb-10 flex flex-col sm:flex-row items-center gap-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                    <UserCircle className="w-40 h-40" />
                </div>

                <div className="relative">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary to-green-600 flex items-center justify-center border-4 border-white dark:border-zinc-800 shadow-2xl">
                        <span className="text-4xl font-black text-white italic">{initials}</span>
                    </div>
                </div>

                <div className="flex-1 text-center sm:text-left relative z-10">
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">{profile?.full_name}</h2>
                    <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 rounded-xl">
                            <Mail className="w-3 h-3 text-primary" />
                            {profile?.email}
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 rounded-xl">
                            <MapPin className="w-3 h-3 text-primary" />
                            {profile?.city || "Ville non précisée"}
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-3">
                        <span className={cn(
                            "text-white text-[9px] font-black px-5 py-2 rounded-full uppercase tracking-[0.2em] shadow-lg",
                            profile?.role === 'vendeur' ? 'bg-primary shadow-primary/20' :
                                profile?.role === 'collecteur' ? 'bg-amber-600 shadow-amber-600/20' :
                                    'bg-blue-600 shadow-blue-600/20'
                        )}>
                            {profile?.role === 'vendeur' ? 'Citoyen' : profile?.role === 'collecteur' ? 'Collecteur' : 'Partenaire / Entreprise'}
                        </span>
                        {profile?.role === 'vendeur' && (
                            <div className="bg-green-500/10 text-green-600 text-[9px] font-black px-5 py-2 rounded-full border border-green-500/20 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Leaf className="w-3 h-3" />
                                {profile?.eco_points || 0} Points Éco
                            </div>
                        )}
                        <span className="bg-green-500/10 text-green-600 text-[9px] font-black px-5 py-2 rounded-full border border-green-500/20 uppercase tracking-[0.2em]">
                            Compte Vérifié
                        </span>
                    </div>
                </div>

                <button className="px-8 py-4 bg-gray-900 text-white dark:bg-zinc-800 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl shadow-gray-200 dark:shadow-none">
                    Modifier
                </button>
            </div>

            {/* Menu List */}
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden mb-10">
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => navigateSafe(router, item.route as any)}
                        className={cn(
                            "w-full flex items-center justify-between p-8 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all group",
                            index !== menuItems.length - 1 && "border-b border-gray-50 dark:border-zinc-800"
                        )}
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner">
                                {item.icon}
                            </div>
                            <span className="font-black text-gray-700 dark:text-gray-300 uppercase text-xs tracking-widest">{item.label}</span>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-200 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </button>
                ))}
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-4 p-8 bg-red-50 dark:bg-red-950/10 text-red-600 rounded-[3rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-red-100 dark:hover:bg-red-950/20 transition-all group active:scale-[0.98] border border-red-100 dark:border-red-900/30"
            >
                <LogOut className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                Fermer la session
            </button>
        </div>
    );
}
