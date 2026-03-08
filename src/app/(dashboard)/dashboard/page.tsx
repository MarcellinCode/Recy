"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    Leaf,
    TrendingUp,
    Zap,
    Award,
    ShieldCheck,
    ArrowUpRight,
    Loader2,
    PieChart,
    Building2,
    ArrowDown
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const supabase = createClient();
    const [stats, setStats] = useState<any>({
        totalWeight: 0,
        co2Saved: 0,
        ecoPoints: 0,
        collectionsCount: 0,
        wasteDistribution: []
    });
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setProfile(prof);

            // Fetch wastes for this user (as seller or collector)
            const { data: wastes } = await supabase
                .from('wastes')
                .select('*, waste_types(name)')
                .or(`seller_id.eq.${user.id},collector_id.eq.${user.id}`)
                .eq('status', 'collected');

            if (wastes) {
                const totalWeight = wastes.reduce((acc, w) => acc + (w.final_weight || w.estimated_weight), 0);
                const co2Saved = totalWeight * 1.22; // Average CO2 saved per kg

                // Group by waste type
                const distributionMap: any = {};
                wastes.forEach(w => {
                    const type = w.waste_types?.name || "Autre";
                    const weight = w.final_weight || w.estimated_weight;
                    distributionMap[type] = (distributionMap[type] || 0) + weight;
                });

                const wasteDistribution = Object.entries(distributionMap).map(([name, value]) => ({ name, value }));

                setStats({
                    totalWeight,
                    co2Saved,
                    ecoPoints: prof?.eco_points || 0,
                    collectionsCount: wastes.length,
                    wasteDistribution
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
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">Calcul de votre impact en temps réel...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <header className="mb-16">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <h1 className="text-xs font-black text-primary uppercase tracking-[0.4em]">Analytics & Impact RSE</h1>
                </div>
                <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                    Votre Performance <span className="text-primary italic">Écologique</span>
                </h2>
            </header>

            {/* Key Figures */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                <StatCard
                    title="Déchets Recyclés"
                    value={`${stats.totalWeight.toLocaleString()} kg`}
                    icon={<Zap className="w-6 h-6" />}
                    trend="+12%"
                    color="primary"
                />
                <StatCard
                    title="Impact CO2 Évité"
                    value={`${stats.co2Saved.toFixed(1)} kg`}
                    icon={<Leaf className="w-6 h-6" />}
                    trend="-24.5%"
                    color="emerald"
                />
                <StatCard
                    title="Points Éco Gagnés"
                    value={stats.ecoPoints}
                    icon={<Award className="w-6 h-6" />}
                    trend="+500"
                    color="amber"
                />
                <StatCard
                    title="Collectes Validées"
                    value={stats.collectionsCount}
                    icon={<ShieldCheck className="w-6 h-6" />}
                    trend="+3"
                    color="blue"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Distribution Chart (Simple SVG Implementation for Premium Feel) */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/20">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Volume par Catégorie</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Répartition de votre impact</p>
                        </div>
                        <PieChart className="w-6 h-6 text-primary" />
                    </div>

                    <div className="space-y-8">
                        {stats.wasteDistribution.length > 0 ? (
                            stats.wasteDistribution.map((item: any, idx: number) => {
                                const percentage = (item.value / stats.totalWeight) * 100;
                                return (
                                    <div key={idx} className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{item.name}</span>
                                            <span className="text-xs font-black text-primary italic">{item.value} kg ({percentage.toFixed(0)}%)</span>
                                        </div>
                                        <div className="h-4 bg-gray-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex items-center justify-center h-48 text-gray-300 font-black uppercase text-[10px] tracking-widest italic">
                                En attente de données...
                            </div>
                        )}
                    </div>
                </div>

                {/* Real-time Ticker or Recent Activity */}
                <div className="bg-zinc-900 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col justify-between">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-8">
                            <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Certificat de <span className="text-primary italic">Matière Responsable</span></h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed mb-8">
                            Basé sur vos activités de recyclage, vous avez contribué à la préservation de
                            <span className="text-white"> {(stats.totalWeight * 0.05).toFixed(1)} arbres </span>
                            et à l'économie de <span className="text-white">{(stats.totalWeight * 0.8).toFixed(0)} litres d'eau</span>.
                        </p>

                        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl mb-8">
                            <div className="flex items-center gap-4 mb-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Certifié par RecyCla</span>
                            </div>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">ID: RSE-{Math.random().toString(36).substring(7).toUpperCase()}</p>
                        </div>
                    </div>

                    <button className="relative z-10 w-full py-5 bg-white text-zinc-900 font-black rounded-2xl hover:bg-gray-100 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                        Télécharger le Rapport RSE
                        <ArrowUpRight className="w-4 h-4" />
                    </button>

                    <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary/20 blur-[100px] rounded-full"></div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend, color = "primary" }: any) {
    const colors: any = {
        primary: "text-primary bg-primary/10",
        emerald: "text-emerald-500 bg-emerald-500/10",
        amber: "text-amber-500 bg-amber-500/10",
        blue: "text-blue-500 bg-blue-500/10"
    };

    return (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 hover:scale-[1.02] transition-all shadow-lg shadow-gray-200/10">
            <div className="flex items-start justify-between mb-8">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", colors[color])}>
                    {icon}
                </div>
                <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1",
                    trend.startsWith('+') ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                    {trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {trend}
                </div>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{title}</p>
            <h4 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">{value}</h4>
        </div>
    );
}
