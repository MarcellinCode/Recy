"use client";

import { useState, useEffect } from "react";
import { 
    Map as MapIcon, 
    ShieldCheck, 
    Users, 
    Building2, 
    Plus, 
    Search, 
    Filter,
    ArrowUpRight,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function MairieDashboard() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [zones, setZones] = useState<any[]>([]);
    const [concessions, setConcessions] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: zonesData } = await supabase.from('zones').select('*');
            const { data: concessionsData } = await supabase.from('concessions').select('*, zones(*), profiles(*)');
            
            setZones(zonesData || []);
            setConcessions(concessionsData || []);
            setLoading(false);
        };
        fetchData();
    }, [supabase]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 mb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-[2px] bg-primary"></span>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">Administration Municipale</p>
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black uppercase italic tracking-tighter leading-none dark:text-white">
                        CITICLINE <span className="text-primary">City OS</span>
                    </h1>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-4">Gestion des zones de collecte et des concessions environnementales.</p>
                </div>
                <button className="flex items-center gap-3 px-8 py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-primary/20">
                    <Plus className="w-5 h-5" />
                    Créer une Zone
                </button>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    label="Zones Totales" 
                    value={zones.length.toString()} 
                    sub="Couverture : 85%" 
                    icon={MapIcon}
                    color="text-blue-500"
                />
                <StatCard 
                    label="Concessions Actives" 
                    value={concessions.filter(c => c.status === 'active').length.toString()} 
                    sub="+2 ce mois-ci" 
                    icon={Building2}
                    color="text-emerald-500"
                />
                <StatCard 
                    label="Revenus Municipaux" 
                    value="2.4M" 
                    sub="F CFA / Mois" 
                    icon={TrendingUp}
                    color="text-primary"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Zones Table */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Zones de Collecte</h2>
                        <div className="flex gap-2">
                            <button className="p-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg"><Filter className="w-4 h-4 text-zinc-400" /></button>
                            <button className="p-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg"><Search className="w-4 h-4 text-zinc-400" /></button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Nom de la Zone</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Statut</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Opérateur</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {zones.length > 0 ? zones.map((zone) => (
                                    <tr key={zone.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-gray-900 dark:text-white">{zone.name}</p>
                                            <p className="text-[10px] text-zinc-500 uppercase font-medium">{zone.city}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                zone.status === 'available' ? "bg-emerald-100 text-emerald-700" :
                                                zone.status === 'rented' ? "bg-blue-100 text-blue-700" :
                                                "bg-amber-100 text-amber-700"
                                            )}>
                                                {zone.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 font-medium text-sm text-zinc-600 dark:text-zinc-400">
                                            {zone.status === 'rented' ? "Trier-Pro SARL" : "—"}
                                        </td>
                                        <td className="px-6 py-5">
                                            <button className="text-primary font-black text-[10px] uppercase hover:underline">Détails</button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center opacity-30 italic">
                                            <MapIcon className="w-12 h-12 mx-auto mb-4" />
                                            Aunuce zone définie pour le moment.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Activities / Alerts */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Dossiers en Attente</h2>
                    <div className="space-y-4">
                        <PendingConcessionCard 
                            org="Eco-Collect Abidjan"
                            zone="Zone Sud (Biétry)"
                            type="Nouvelle Demande"
                            icon={Clock}
                            color="text-amber-500"
                        />
                        <PendingConcessionCard 
                            org="GreenCity Solutions"
                            zone="Zone Ouest (Yopougon)"
                            type="Renouvellement"
                            icon={CheckCircle2}
                            color="text-emerald-500"
                        />
                         <div className="p-8 bg-zinc-900 dark:bg-black rounded-[2.5rem] text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
                                <AlertCircle className="w-24 h-24 text-primary" />
                            </div>
                            <h3 className="text-xl font-black uppercase italic mb-2">Rapport CityClean</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed mb-6 italic">Visualisez les zones à forte concentration de signalements "Bac Plein".</p>
                            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary group-hover:gap-3 transition-all">
                                Consulter la carte <ArrowUpRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] shadow-sm flex items-start justify-between"
        >
            <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
                <p className="text-4xl font-black italic tracking-tighter dark:text-white">{value}</p>
                <p className="text-xs font-bold text-emerald-500">{sub}</p>
            </div>
            <div className={cn("w-14 h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center", color)}>
                <Icon className="w-6 h-6" />
            </div>
        </motion.div>
    );
}

function PendingConcessionCard({ org, zone, type, icon: Icon, color }: any) {
    return (
        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl hover:border-primary/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center", color)}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{type}</span>
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white uppercase text-sm mb-1">{org}</h4>
            <p className="text-xs text-zinc-500 font-medium mb-4">{zone}</p>
            <div className="flex gap-2">
                <button className="flex-1 py-3 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all">Approuver</button>
                <button className="flex-1 py-3 bg-gray-50 dark:bg-zinc-800 text-zinc-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-50 hover:text-red-500 transition-all text-center flex items-center justify-center">Refuser</button>
            </div>
        </div>
    );
}
