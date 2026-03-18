"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
    BarChart3, 
    Leaf, 
    Zap, 
    Award, 
    ShieldCheck, 
    ArrowUpRight, 
    Loader2, 
    Package, 
    Wallet, 
    MapPin, 
    Building2, 
    CircleDollarSign,
    CalendarDays,
    Navigation,
    TrendingUp,
    Truck
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useUnreadBadges } from "@/hooks/useUnreadBadges";

export default function DashboardPage() {
    const supabase = createClient();
    const { unreadMessages, unreadReservations } = useUnreadBadges();
    
    const [stats, setStats] = useState<any>({
        totalWeight: 0,
        co2Saved: 0,
        ecoPoints: 0,
        collectionsCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setProfile(prof);

            const { data: wastes } = await supabase
                .from('wastes')
                .select('*')
                .or(`seller_id.eq.${user.id},collector_id.eq.${user.id}`)
                .eq('status', 'collected');

            if (wastes) {
                const totalWeight = wastes.reduce((acc, w) => acc + (w.final_weight || w.estimated_weight), 0);
                setStats({
                    totalWeight,
                    co2Saved: totalWeight * 1.22,
                    ecoPoints: prof?.eco_points || 0,
                    collectionsCount: wastes.length
                });
            }
            setLoading(false);
        };
        fetchStats();
    }, [supabase]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Initialisation du Hub...</p>
            </div>
        );
    }

    const hubCards = [
        { 
            title: "Réservations", 
            description: "Suivez vos lots réservés", 
            icon: CalendarDays, 
            href: "/reservations", 
            color: "bg-blue-500", 
            badge: unreadReservations
        },
        ...(profile?.role !== 'vendeur' ? [{ 
            title: "Carte Live", 
            description: "Explorer les déchets autour", 
            icon: MapPin, 
            href: "/carte", 
            color: "bg-emerald-500" 
        }] : []),
        { 
            title: "Mes Déchets", 
            description: "Gérer vos publications", 
            icon: Package, 
            href: "/mes-dechets", 
            color: "bg-amber-500" 
        },
        { 
            title: "Mon Portefeuille", 
            description: "Consultez vos gains", 
            icon: Wallet, 
            href: "/wallet", 
            color: "bg-purple-500" 
        },
        // --- NEW CITY OS MODULES ---
        ...(profile?.role === 'vendeur' ? [
            { 
                title: "Mon Service", 
                description: "Gestion abonnement & alertes", 
                icon: ShieldCheck, 
                href: "/abonnement", 
                color: "bg-emerald-600" 
            }
        ] : []),
        ...(profile?.role === 'mairie' ? [
            { 
                title: "Administration", 
                description: "Gestion des zones & concessions", 
                icon: Building2, 
                href: "/admin/mairie", 
                color: "bg-zinc-800" 
            }
        ] : []),
        ...(profile?.role === 'organisation_admin' ? [
            { 
                title: "Flotte & Subs", 
                description: "Gestion agents et revenus", 
                icon: Truck, 
                href: "/admin/organisation", 
                color: "bg-indigo-600" 
            }
        ] : []),
        ...(profile?.role === 'agent_collecteur' ? [
            { 
                title: "Ma Mission", 
                description: "Feuille de route optimisée", 
                icon: Navigation, 
                href: "/missions", 
                color: "bg-primary" 
            }
        ] : []),
        // Premium sections hidden for regular citizens
        ...(profile?.role === 'entreprise' || profile?.role === 'collecteur' ? [
            { 
                title: "Appels d'Offres", 
                description: "Espace B2B & Entreprises", 
                icon: Building2, 
                href: "/appels-offres", 
                color: "bg-indigo-500" 
            },
            { 
                title: "Impact RSE", 
                description: "Votre bilan écologique", 
                icon: Leaf, 
                href: "#", 
                color: "bg-green-600" 
            }
        ] : [])
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-screen pb-24">
            {/* Header section with User emphasis */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
            >
                <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-[2px] bg-primary"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">CITICLINE Central Hub</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-black uppercase italic tracking-tighter leading-none dark:text-white">
                            Bonjour, <span className="text-primary">{profile?.full_name?.split(' ')[0] || "Eco-Guerrier"}</span>
                        </h1>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-2">Prêt pour votre prochaine action écologique ?</p>
                    </div>
                    
                    {/* Quick Wallet Summary */}
                    <Link href="/wallet" className="group flex items-center gap-4 bg-zinc-900 dark:bg-white p-4 rounded-[2rem] border border-white/10 dark:border-zinc-200 shadow-xl self-start sm:self-auto transition-all hover:scale-105">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                            <CircleDollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Solde Actuel</p>
                            <p className="text-lg font-black text-white dark:text-zinc-900 italic tracking-tighter">{profile?.wallet_balance?.toLocaleString()} F CFA</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-zinc-600 group-hover:text-primary transition-colors ml-2" />
                    </Link>
                </div>
            </motion.header>

            {/* Quick Stats Grid */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                <MiniStat 
                    label="Recyclé" 
                    value={`${stats.totalWeight}kg`} 
                    icon={Zap} 
                    delay={0.1}
                />
                <MiniStat 
                    label="CO2 Évité" 
                    value={`${stats.co2Saved.toFixed(0)}kg`} 
                    icon={Leaf} 
                    delay={0.2}
                />
                <MiniStat 
                    label="Points" 
                    value={stats.ecoPoints} 
                    icon={Award} 
                    delay={0.3}
                />
                <MiniStat 
                    label="Collectes" 
                    value={stats.collectionsCount} 
                    icon={ShieldCheck} 
                    delay={0.4}
                />
            </section>

            {/* Main Hub Navigation */}
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6">Menu Principal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {hubCards.map((card, idx) => (
                    <motion.div
                        key={card.title}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * idx }}
                    >
                        <Link 
                            href={card.href}
                            className="group relative flex flex-col p-8 bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-50 dark:border-zinc-800 shadow-lg shadow-zinc-200/50 dark:shadow-none hover:border-primary/20 dark:hover:border-primary/30 transition-all overflow-hidden"
                        >
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-zinc-200/20 relative", card.color)}>
                                <card.icon className="w-7 h-7 text-white" />
                                {card.badge ? (
                                    <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[24px] h-[24px] text-[10px] font-black text-white bg-red-500 rounded-full px-1.5 shadow-lg border-4 border-white dark:border-zinc-900">
                                        {card.badge}
                                    </span>
                                ) : null}
                            </div>
                            
                            <h4 className="text-xl font-black uppercase italic tracking-tighter dark:text-white mb-2">{card.title}</h4>
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{card.description}</p>

                            <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-widest text-primary gap-2 group-hover:gap-3 transition-all">
                                Explorer <ArrowUpRight className="w-3.5 h-3.5" />
                            </div>

                            {/* Background Pattern */}
                            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <card.icon className="w-16 h-16 text-zinc-100 dark:text-zinc-800" />
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Bottom Promotional / System Card - Only for collectors looking to upgrade */}
            {(profile?.role === 'collecteur') && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-12 p-1 bg-gradient-to-r from-primary/40 to-emerald-500/40 rounded-[3rem]"
                >
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.9rem] p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div className="text-center lg:text-left">
                            <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter mb-2 dark:text-white">Devenez un <span className="text-primary italic">Partenaire Certifié</span></h3>
                            <p className="text-xs sm:text-sm font-medium text-zinc-500 max-w-xl">Boostez votre visibilité et accédez à des lots premium en passant au forfait Business.</p>
                        </div>
                        <Link href="/abonnements" className="px-10 py-5 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                            En savoir plus
                        </Link>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

function MiniStat({ label, value, icon: Icon, delay }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-3 sm:gap-4"
        >
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
                <p className="text-sm sm:text-base font-black italic tracking-tighter dark:text-white">{value}</p>
            </div>
        </motion.div>
    );
}
