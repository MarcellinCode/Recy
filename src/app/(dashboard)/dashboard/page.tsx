"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    Truck,
    Users
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useUnreadBadges } from "@/hooks/useUnreadBadges";

function rejectAfter(ms: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), ms);
    });
}

export default function DashboardPage() {
    const supabase = createClient();
    const router = useRouter();
    const { unreadMessages, unreadReservations } = useUnreadBadges();
    
    const [stats, setStats] = useState<any>({
        totalWeight: 0,
        co2Saved: 0,
        ecoPoints: 0,
        collectionsCount: 0,
        citizenCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [activeSub] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Try to get session, fallback if slow but do not crash the UI
                let session = null;
                try {
                    const sessionPromise = supabase.auth.getSession();
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000));
                    const res = await Promise.race([sessionPromise, timeoutPromise]) as any;
                    session = res?.data?.session;
                } catch (e) {
                    console.warn("Dashboard Auth session fetch timed out, attempting direct user check:", e);
                    const { data } = await supabase.auth.getUser();
                    if (data?.user) {
                        session = { user: data.user } as any;
                    }
                }
                
                const user = session?.user;
                
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Requêtes simples sans jointures complexes pour débloquer
                const [profRes, wastesRes] = await Promise.all([
                    supabase.from('profiles').select('id,full_name,role,city,eco_points,wallet_balance').eq('id', user.id).maybeSingle(),
                    supabase.from('wastes').select('id,final_weight,estimated_weight,status').or(`seller_id.eq.${user.id},collector_id.eq.${user.id}`)
                ]);

                const prof = profRes.data;
                setProfile(prof);

                const wastes = wastesRes.data;
                if (wastes) {
                    const totalWeight = wastes.reduce((acc: number, w: any) => acc + (w.final_weight || w.estimated_weight), 0);
                    
                    let citizenCount = 0;
                    if (prof?.role === 'mairie' && prof?.city) {
                        try {
                            
                            const { count } = await supabase
                                .from('profiles')
                                .select('*', { count: 'exact', head: true })
                                .eq('role', 'vendeur')
                                .ilike('city', `%${prof.city}%`);
                            citizenCount = count || 0;
                        } catch (e) {
                            console.error("Error fetching citizen count", e);
                        }
                    }

                    setStats({
                        totalWeight,
                        co2Saved: totalWeight * 1.22,
                        ecoPoints: prof?.eco_points || 0,
                        collectionsCount: wastes.length,
                        citizenCount
                    });
                }
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-zinc-950">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse">Initialisation du Hub...</p>
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
                description: activeSub?.plan?.name || "Gestion abonnement & alertes", 
                icon: ShieldCheck, 
                href: "/abonnements", 
                color: "bg-emerald-600" 
            }
        ] : []),
        ...(profile?.role === 'mairie' ? [
            { 
                title: "Administration", 
                description: "Gestion des zones & concessions", 
                icon: Building2, 
                href: "/city-os", 
                color: "bg-zinc-800" 
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
        ...(profile?.role === 'entreprise' || profile?.role === 'organisation_admin' || profile?.role === 'collecteur' ? [
            { 
                title: "Appels d'Offres", 
                description: "Espace B2B & Entreprises", 
                icon: Building2, 
                href: "/appels-offres", 
                color: "bg-indigo-500" 
            },
            ...(profile?.role === 'collecteur' ? [] : [
                { 
                    title: "Mission Control", 
                    description: "Gestion agents & concessions", 
                    icon: TrendingUp, 
                    href: "/organisation", 
                    color: "bg-zinc-900" 
                },
                { 
                    title: "Carnet d'Entretien", 
                    description: "Suivi technique & vidange", 
                    icon: Truck, 
                    href: "/flotte", 
                    color: "bg-primary" 
                }
            ]),
                { 
                    title: "Impact RSE", 
                    description: "Votre bilan écologique", 
                    icon: Leaf, 
                    href: "/impact-rse", 
                    color: "bg-green-600" 
                }
        ] : []),
    ];

    let welcomeSubText = "Prêt pour votre prochaine action écologique ?";
    if (activeSub?.plan?.name?.toLowerCase().includes('usine')) {
        welcomeSubText = "Tableau de bord industriel Citicline";
    } else if (activeSub?.plan?.name?.toLowerCase().includes('entreprise')) {
        welcomeSubText = "Espace de gestion entreprise";
    }

    return (
        <div className="bg-transparent min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24">
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
                        <h1 className="text-4xl sm:text-5xl font-black uppercase italic tracking-tighter leading-none text-zinc-900">
                            Bonjour, <span className="text-primary">{profile?.full_name?.split(' ')[0] || "Eco-Guerrier"}</span>
                        </h1>
                        <p className="text-sm font-medium text-zinc-500 mt-2">
                            {welcomeSubText}
                        </p>
                    </div>
                    
                    {/* Quick Wallet Summary */}
                    <Link 
                        href="/wallet" 
                        onClick={(e) => { e.preventDefault(); router.push("/wallet"); }}
                        className="group flex items-center gap-4 bg-white p-4 rounded-[2rem] border border-gray-100 shadow-md self-start sm:self-auto transition-all hover:scale-105"
                    >
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                            <CircleDollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-450">Solde Actuel</p>
                            <p className="text-lg font-black text-zinc-900 italic tracking-tighter">{profile?.wallet_balance?.toLocaleString()} F CFA</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors ml-2" />
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
                    label={profile?.role === 'mairie' ? "Citoyens" : "Points"} 
                    value={profile?.role === 'mairie' ? stats.citizenCount : stats.ecoPoints} 
                    icon={profile?.role === 'mairie' ? Users : Award} 
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
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6">Menu Principal</h3>
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
                            onClick={(e) => {
                                e.preventDefault();
                                router.push(card.href);
                            }}
                            className="group relative flex flex-col p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:border-primary/30 transition-all overflow-hidden"
                        >
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-md relative", card.color)}>
                                <card.icon className="w-7 h-7 text-white" />
                                {card.badge ? (
                                    <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[24px] h-[24px] text-[10px] font-black text-white bg-red-500 rounded-full px-1.5 shadow-lg border-4 border-white">
                                        {card.badge}
                                    </span>
                                ) : null}
                            </div>
                            
                            <h4 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900 mb-2">{card.title}</h4>
                            <p className="text-xs font-medium text-zinc-500">{card.description}</p>

                            <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-widest text-primary gap-2 group-hover:gap-3 transition-all">
                                Explorer <ArrowUpRight className="w-3.5 h-3.5" />
                            </div>

                            {/* Background Pattern */}
                            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gray-100/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <card.icon className="w-16 h-16 text-zinc-300/30" />
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
                    <div className="bg-white rounded-[2.9rem] p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 border border-gray-100">
                        <div className="text-center lg:text-left">
                            <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter mb-2 text-zinc-900">Devenez un <span className="text-primary italic">Partenaire Certifié</span></h3>
                            <p className="text-xs sm:text-sm font-medium text-zinc-500 max-w-xl">Boostez votre visibilité et accédez à des lots premium en passant au forfait Business.</p>
                        </div>
                        <Link 
                            href="/abonnements" 
                            onClick={(e) => { e.preventDefault(); router.push("/abonnements"); }}
                            className="px-10 py-5 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            En savoir plus
                        </Link>
                    </div>
                </motion.div>
            )}
        </div>
    </div>
    );
}

function MiniStat({ label, value, icon: Icon, delay }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4"
        >
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shadow-inner">
                <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
                <p className="text-sm sm:text-base font-black italic tracking-tighter text-zinc-900">{value}</p>
            </div>
        </motion.div>
    );
}
