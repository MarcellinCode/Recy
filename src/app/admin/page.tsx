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
    Globe,
    Loader2,
    History,
    CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function SuperAdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        users: 0,
        weight: 0,
        transactions: 0,
        platform_revenue: 0
    });
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    async function fetchDashboardData() {
        setLoading(true);
        try {
            // Count total users
            const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            
            // Sum total weight from wastes (collected)
            const { data: weightData } = await supabase.from('wastes').select('final_weight').eq('status', 'collected');
            const totalWeight = weightData?.reduce((acc, curr) => acc + (Number(curr.final_weight) || 0), 0) || 0;

            // Stats from transactions
            const { data: transData } = await supabase
                .from('transactions')
                .select('*, profiles(full_name)')
                .order('created_at', { ascending: false })
                .limit(5);

            const { data: allTrans } = await supabase.from('transactions').select('amount').eq('type', 'income');
            const totalTransAmount = allTrans?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
            
            // Get commission from settings (fall back to 5% if not found)
            const { data: setts } = await supabase.from('system_settings').select('value').eq('key', 'platform_commission').single();
            const commPercent = setts ? Number(setts.value) : 5;
            const estimatedRevenue = totalTransAmount * (commPercent / 100);

            setStats({
                users: usersCount || 0,
                weight: totalWeight,
                transactions: totalTransAmount,
                platform_revenue: estimatedRevenue
            });

            setRecentTransactions(transData || []);

            // Fetch organizations
            const { data: orgs } = await supabase
                .from('profiles')
                .select('*')
                .in('role', ['mairie', 'entreprise'])
                .limit(4)
                .order('created_at', { ascending: false });
            
            setOrganizations(orgs || []);
        } catch (error) {
            console.error("Dashboard data fetch error:", error);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Synchronisation des données...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Top Bar / Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                        Control <span className="text-primary tracking-tighter">Center</span>
                    </h1>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed">Global Supervision & Ecosystem Governance</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col text-right">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Système Opérationnel</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Connecté à Supabase Global</span>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                        <Activity size={20} className="animate-pulse" />
                    </div>
                </div>
            </header>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Citoyens", value: stats.users, icon: Users, color: "text-blue-500", bg: "bg-blue-50", trend: "+12%" },
                    { label: "Poids Collecté", value: `${(stats.weight / 1000).toFixed(1)}T`, icon: Globe, color: "text-emerald-500", bg: "bg-emerald-50", trend: "+45%" },
                    { label: "Volume d'Affaire", value: `${Math.round(stats.transactions / 1000)}k`, icon: Banknote, color: "text-amber-500", bg: "bg-amber-50", trend: "+8%" },
                    { label: "Revenu Plateforme", value: `${Math.round(stats.platform_revenue).toLocaleString()} F`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/5", trend: "+15%" }
                ].map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="group bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:scale-[1.02] hover:border-primary/20"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12", stat.bg, stat.color)}>
                                <stat.icon size={26} />
                            </div>
                            <span className={cn("text-[9px] font-black px-2 py-1 rounded-full", stat.bg, stat.color)}>{stat.trend}</span>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Financial Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-3">
                            <History className="text-primary" size={20} />
                            Flux Financier Récent
                        </h2>
                        <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors">Tout voir</button>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-[3.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-50 dark:border-zinc-800/50">
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Utilisateur</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                {recentTransactions.map((tx, i) => (
                                    <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-gray-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-[10px] font-black">
                                                    {tx.profiles?.full_name?.charAt(0) || <Activity size={12}/>}
                                                </div>
                                                <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase italic">{tx.profiles?.full_name || 'Utilisateur'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={cn(
                                                "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                                                tx.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                            )}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-gray-900 dark:text-white text-xs">
                                            {tx.amount.toLocaleString()} F
                                        </td>
                                    </tr>
                                ))}
                                {recentTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-10 text-center text-[10px] font-black text-gray-400 uppercase italic opacity-50">Aucune transaction récente</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Access Side */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-3">
                        <Building2 className="text-primary" size={20} />
                        Partenaires Récents
                    </h2>
                    <div className="space-y-4">
                        {organizations.map((org, i) => (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + (i * 0.1) }}
                                key={i} 
                                className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-black italic">
                                        {org.role === 'mairie' ? 'M' : 'E'}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none mb-1">{org.full_name}</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic">{org.city}</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="text-gray-300 group-hover:text-primary transition-colors" size={18} />
                            </motion.div>
                        ))}
                    </div>

                    <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/40 transition-all" />
                        <ShieldCheck className="text-primary mb-6" size={32} />
                        <h3 className="text-lg font-black uppercase italic mb-2 tracking-tight">Sécurité Système</h3>
                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-6">Tous les terminaux sont synchronisés et sécurisés.</p>
                        <button className="w-full py-4 bg-white/10 border border-white/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all">Audit Global</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
