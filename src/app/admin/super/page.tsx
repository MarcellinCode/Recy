"use client";

import { 
    Users, 
    BarChart3, 
    Banknote, 
    TrendingUp, 
    ArrowUpRight, 
    ArrowDownRight,
    Activity,
    ShieldCheck,
    Building2,
    Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function SuperAdminDashboard() {
    const kpis = [
        { label: "Utilisateurs Totaux", value: "32,840", icon: Users, color: "bg-blue-500", trend: "+12.5%", trendUp: true },
        { label: "Collecte (Tonnes)", value: "1,420.5", icon: BarChart3, color: "bg-primary", trend: "+8.2%", trendUp: true },
        { label: "Volume d'Affaires", value: "24.5M", icon: Banknote, color: "bg-amber-500", trend: "+15.3%", trendUp: true },
        { label: "Impact Éco (CO2)", value: "840kg", icon: Globe, color: "bg-emerald-500", trend: "-5.4%", trendUp: false },
    ];

    return (
        <div className="space-y-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-gray-100 dark:border-zinc-800">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                        Tableau de <span className="text-primary tracking-tighter">Bord Global</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} className="text-primary" />
                        Supervision en temps réel de l'écosystème CITICLINE
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                   <div className="px-4 py-2 bg-primary/10 rounded-xl">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Système de santé</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            <span className="text-xs font-black text-gray-900 dark:text-white uppercase italic">Opérationnel</span>
                        </div>
                   </div>
                </div>
            </header>

            {/* KPI Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm group hover:border-primary transition-all duration-500"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", kpi.color)}>
                                <kpi.icon size={24} />
                            </div>
                            <div className={cn(
                                "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                                kpi.trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                                {kpi.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {kpi.trend}
                            </div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white italic tracking-tighter">{kpi.value}</p>
                    </motion.div>
                ))}
            </section>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Active Organizations */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl flex items-center justify-center text-indigo-600">
                                <Building2 size={24} />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">Organisations Actives</h2>
                        </div>
                        <button className="text-xs font-black text-primary uppercase tracking-widest hover:underline">Voir tout</button>
                    </div>

                    <div className="space-y-6">
                        {[
                            { name: "Mairie d'Abidjan", zone: "Zone A", agents: 45, status: "Actif" },
                            { name: "Eco-Collect CI", zone: "Zone B", agents: 12, status: "En attente" },
                            { name: "Ville de San Pédro", zone: "Zone C", agents: 28, status: "Actif" },
                        ].map((org, i) => (
                            <div key={i} className="flex items-center justify-between p-6 bg-gray-50 dark:bg-zinc-800/50 rounded-3xl border border-gray-100 dark:border-zinc-800/50 hover:translate-x-2 transition-transform cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white dark:bg-zinc-950 rounded-xl flex items-center justify-center border border-gray-100 dark:border-zinc-800 shadow-sm">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{org.name}</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">{org.zone} • {org.agents} Agents</p>
                                    </div>
                                </div>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                    org.status === 'Actif' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                                )}>
                                    {org.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* System Alerts & Monitoring */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gray-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <ShieldCheck size={200} className="text-white" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary">
                                <TrendingUp size={24} />
                            </div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Performance Système</h2>
                        </div>

                        <div className="flex-1 flex flex-col justify-center gap-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-2">Temps de réponse</p>
                                    <p className="text-4xl font-black text-white italic tracking-tighter">124ms</p>
                                    <p className="text-gray-500 text-[10px] font-bold mt-2 uppercase">Stable (99.9% Up)</p>
                                </div>
                                <div>
                                    <p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Transactions / min</p>
                                    <p className="text-4xl font-black text-white italic tracking-tighter">42</p>
                                    <p className="text-gray-500 text-[10px] font-bold mt-2 uppercase">+5% vs hier</p>
                                </div>
                            </div>
                            
                            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl mt-4">
                                <p className="text-white text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Activity size={12} className="text-primary" />
                                    Dernière activité critique
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-gray-400 uppercase font-black">Sync. Supabase Cloud</span>
                                        <span className="text-emerald-400 font-black uppercase">Réussie</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-gray-400 uppercase font-black">Backup journalière</span>
                                        <span className="text-emerald-400 font-black uppercase">Terminée</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
