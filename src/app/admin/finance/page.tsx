"use client";

import { 
    Banknote, 
    ArrowUpRight, 
    ArrowDownRight, 
    Search, 
    Filter,
    Download,
    CreditCard,
    TrendingUp,
    History,
    Wallet,
    DollarSign
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";
import { motion } from "framer-motion";

export default function FinancePage() {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        commissions: 0,
        pendingPayouts: 0
    });
    const supabase = createClient();

    useEffect(() => {
        fetchFinanceData();
    }, []);

    async function fetchFinanceData() {
        setLoading(true);
        try {
            // Fetch Transactions
            const { data: txs, error } = await supabase
                .from('transactions')
                .select('*, profiles(full_name)')
                .order('created_at', { ascending: false });

            if (txs) {
                setTransactions(txs);
                
                // Calculate Stats
                const totalRev = txs
                    .filter((t: any) => t.type === 'income')
                    .reduce((acc: any, curr: any) => acc + (Number(curr.amount) || 0), 0);
                
                // Estimation de commission (à enrichir via system_settings si besoin)
                const comms = txs.reduce((acc: any, curr: any) => acc + (Number(curr.commission_amount) || 0), 0);
                
                const pending = txs.filter((t: any) => t.status === 'Pending').length;

                setStats({
                    totalRevenue: totalRev,
                    commissions: comms || (totalRev * 0.05),
                    pendingPayouts: pending
                });
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                        Gestion des <span className="text-primary tracking-tighter">Finances</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Flux de trésorerie, commissions et paiements partenaires</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all shadow-sm">
                        <Download size={16} />
                        Exporter CSV
                    </button>
                    <button className="flex items-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/20">
                        <Wallet size={16} />
                        Gérer les Retraits
                    </button>
                </div>
            </header>

            {/* Financial Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Volume Total (Brut)", value: stats.totalRevenue.toLocaleString(), icon: Banknote, color: "text-blue-500", trend: "+12%", up: true },
                    { label: "Commissions CITICLINE", value: stats.commissions.toLocaleString(), icon: TrendingUp, color: "text-primary", trend: "+8%", up: true },
                    { label: "Paiements en Attente", value: stats.pendingPayouts.toString(), icon: History, color: "text-amber-500", trend: `${stats.pendingPayouts} Dossiers`, up: null },
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white dark:bg-zinc-900 p-8 rounded-[3.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:scale-[1.02]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("w-12 h-12 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center", stat.color)}>
                                <stat.icon size={22} />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white italic tracking-tighter">
                            {stat.value} <span className="text-[10px]">FCFA</span>
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Transaction List */}
            <section className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-gray-50 dark:border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Transactions Récentes</h2>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="ID, Client..." className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 rounded-xl text-xs outline-none focus:border-primary border border-transparent" />
                        </div>
                        <button className="p-2 bg-gray-50 dark:bg-zinc-800 rounded-xl"><Filter size={16} className="text-gray-400" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-50 dark:border-zinc-800/50">
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date / ID</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entité</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant (CFA)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Commission</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                            {transactions.map((tr, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="text-[11px] font-black text-gray-900 dark:text-white leading-none mb-1">
                                            {new Date(tr.created_at).toLocaleDateString('fr-FR')}
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-bold tracking-widest">#{tr.id}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase">{tr.profiles?.full_name || 'Inconnu'}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{tr.type}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-[11px] font-black text-gray-900 dark:text-white italic">{tr.amount.toLocaleString()}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-[11px] font-black text-primary italic">{(tr.commission_amount || (tr.amount * 0.05)).toLocaleString()}</p>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            tr.status === 'Succeeded' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                        )}>
                                            {tr.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center opacity-30 italic font-black uppercase tracking-widest text-xs">Aucune transaction enregistrée</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
