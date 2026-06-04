"use client";

import { useState, useEffect } from "react";
import { 
    Leaf, 
    Users, 
    Globe, 
    ArrowUpRight, 
    Loader2,
    BarChart3,
    Zap,
    Award
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const PROGRESSION_DATA = [
    { id: "week-1", height: 45, label: "S01" },
    { id: "week-2", height: 60, label: "S02" },
    { id: "week-3", height: 35, label: "S03" },
    { id: "week-4", height: 80, label: "S04" },
    { id: "week-5", height: 55, label: "S05" },
    { id: "week-6", height: 90, label: "S06" },
    { id: "week-7", height: 75, label: "S07" }
];

export default function ImpactRSEPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalWeight: 0,
        co2Saved: 0,
        totalCollections: 0,
        ecoPointsGiven: 0
    });

    useEffect(() => {
        const fetchImpactData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch all collected waste for this organization
            const { data: wastes } = await supabase
                .from('wastes')
                .select('final_weight, estimated_weight')
                .or(`seller_id.eq.${user.id},collector_id.eq.${user.id}`)
                .eq('status', 'collected');

            if (wastes) {
                const totalWeight = wastes.reduce((acc: number, w: any) => acc + (w.final_weight || w.estimated_weight || 0), 0);
                setStats({
                    totalWeight,
                    co2Saved: totalWeight * 1.22, // 1.22kg CO2 saved per kg of recycled waste
                    totalCollections: wastes.length,
                    ecoPointsGiven: totalWeight * 10 // Mock points logic
                });
            }
            setLoading(false);
        };

        fetchImpactData();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Calcul de l'impact environnemental...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 pb-24">
            <header className="mb-16">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Leaf className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Reporting & Impact RSE</p>
                </div>
                <h1 className="text-5xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none mb-4">
                    Votre Bilan <span className="text-emerald-500 italic">Écologique</span>
                </h1>
                <p className="max-w-2xl text-zinc-500 text-sm font-medium leading-relaxed">
                    Visualisez en temps réel l'impact positif de votre organisation sur l'environnement et la communauté grâce à la traçabilité CleanZone.
                </p>
            </header>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <ImpactCard 
                    label="CO2 Évité" 
                    value={`${stats.co2Saved.toFixed(1)}kg`} 
                    icon={Globe} 
                    color="text-blue-500"
                    bg="bg-blue-50"
                />
                <ImpactCard 
                    label="Matière Recyclée" 
                    value={`${stats.totalWeight}kg`} 
                    icon={Zap} 
                    color="text-emerald-500"
                    bg="bg-emerald-50"
                />
                <ImpactCard 
                    label="Points Éco" 
                    value={stats.ecoPointsGiven} 
                    icon={Award} 
                    color="text-amber-500"
                    bg="bg-amber-50"
                />
                <ImpactCard 
                    label="Collectes" 
                    value={stats.totalCollections} 
                    icon={Users} 
                    color="text-indigo-500"
                    bg="bg-indigo-50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Mock/Placeholder */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                        <BarChart3 className="w-8 h-8 text-zinc-100 dark:text-zinc-800" />
                    </div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 dark:text-white">Progression Mensuelle</h3>
                    
                    <div className="h-64 flex items-end justify-between gap-4 px-4 font-black">
                        {PROGRESSION_DATA.map((item) => (
                            <div key={item.id} className="flex-1 space-y-2">
                                <div 
                                    className="bg-emerald-500/20 hover:bg-emerald-500 transition-all rounded-t-xl group relative" 
                                    style={{ height: `${item.height}%` }}
                                >
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                        {item.height}kg
                                    </span>
                                </div>
                                <p className="text-[8px] text-center text-zinc-400">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Impact Cert Card */}
                <div className="bg-zinc-900 p-10 rounded-[3rem] text-white flex flex-col justify-between group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] group-hover:bg-emerald-500/20 transition-all" />
                    
                    <div>
                        <Leaf className="w-12 h-12 text-emerald-500 mb-6" />
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4 leading-tight">Générer votre <br/> Certificat d'Impact</h3>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed uppercase tracking-wider mb-8">
                            Téléchargez un rapport officiel certifié par la blockchain CleanZone pour votre communication RSE.
                        </p>
                    </div>

                    <button onClick={() => globalThis.print()} className="w-full py-5 bg-white text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
                        Télécharger le PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

function ImpactCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:scale-105"
        >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", bg, color)}>
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-3xl font-black italic tracking-tighter dark:text-white">{value}</p>
            <div className="flex items-center gap-1 mt-4 text-[10px] font-black text-emerald-500 uppercase italic">
                <ArrowUpRight className="w-3 h-3" />
                +12% vs mois dernier
            </div>
        </motion.div>
    );
}
