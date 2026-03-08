"use client";

import { useState, useEffect, useMemo } from "react";
import { Wallet, ArrowUpRight, ArrowDownLeft, TrendingUp, History, Loader2, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function WalletPage() {
    const supabase = useMemo(() => createClient(), []);
    const [profile, setProfile] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [totalWeight, setTotalWeight] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWalletData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch Profile for balance
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(profileData);

                // Fetch Transactions
                const { data: txData } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('profile_id', user.id)
                    .order('created_at', { ascending: false });
                setTransactions(txData || []);

                // Fetch Total Weight (Real data)
                const { data: wastesData } = await supabase
                    .from('wastes')
                    .select('final_weight, estimated_weight')
                    .or(`seller_id.eq.${user.id},collector_id.eq.${user.id}`)
                    .eq('status', 'collected');

                const total = wastesData?.reduce((acc, w) => acc + Number(w.final_weight || w.estimated_weight || 0), 0) || 0;
                setTotalWeight(total);

            } catch (err) {
                console.error("Error fetching wallet data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchWalletData();
    }, [supabase]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR').format(amount) + " FCFA";
    };

    const monthlyIncome = transactions
        .filter(tx => tx.type === 'income' && new Date(tx.created_at).getMonth() === new Date().getMonth())
        .reduce((acc, tx) => acc + Number(tx.amount), 0);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Synchronisation bancaire...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center justify-between mb-10">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-4 tracking-tighter uppercase italic">
                    <Wallet className="w-10 h-10 text-primary" />
                    Finance <span className="text-primary">Recy</span>
                </h1>
                <div className="px-5 py-2.5 bg-green-500/10 text-green-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Portefeuille Sécurisé
                </div>
            </div>

            {/* Balance Card */}
            <div className="bg-zinc-900 rounded-[3.5rem] p-12 text-white shadow-2xl shadow-primary/10 mb-12 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                    <CreditCard className="w-48 h-48 rotate-12" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Solde Actuel</span>
                    </div>
                    <h2 className="text-6xl sm:text-7xl font-black mb-10 tracking-tighter">
                        {formatCurrency(profile?.wallet_balance || 0).split(' ')[0]}
                        <span className="text-2xl text-primary ml-2 uppercase italic">FCFA</span>
                    </h2>
                    <div className="flex flex-wrap gap-4">
                        <button className="flex-1 min-w-[160px] bg-primary text-white hover:bg-primary/90 transition-all py-5 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20">
                            <ArrowDownLeft className="w-5 h-5" />
                            Effectuer un retrait
                        </button>
                        <button className="flex-1 min-w-[160px] bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all border border-white/10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                            <ArrowUpRight className="w-5 h-5 text-gray-400" />
                            Charger le compte
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Stats */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-xl hover:shadow-gray-100 dark:hover:shadow-none">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shadow-inner">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenus ce mois</p>
                        </div>
                        <p className="text-3xl font-black text-gray-900 dark:text-white italic">+{formatCurrency(monthlyIncome)}</p>
                    </div>
                    <div className="bg-primary/5 p-8 rounded-[2.5rem] border-2 border-primary/10 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                                <History className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Total Collecté</p>
                        </div>
                        <p className="text-3xl font-black text-gray-900 dark:text-white italic">{totalWeight} <span className="text-sm font-bold opacity-30 tracking-normal uppercase">kg</span></p>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-sm h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Historique</h3>
                            <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Filtrer</button>
                        </div>
                        <div className="space-y-4">
                            {transactions.length > 0 ? transactions.map((tx) => (
                                <div key={tx.id} className="group flex items-center justify-between p-6 rounded-[2rem] bg-gray-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 transition-all border border-transparent hover:border-gray-100 dark:hover:border-zinc-700 shadow-sm hover:shadow-lg">
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                                            tx.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                        )}>
                                            {tx.type === "income" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-widest mb-1">{tx.description || tx.type}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={cn(
                                        "text-lg font-black italic",
                                        tx.type === "income" ? "text-green-600" : "text-gray-900 dark:text-white"
                                    )}>
                                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(Number(tx.amount))}
                                    </p>
                                </div>
                            )) : (
                                <div className="py-20 text-center opacity-30 italic">
                                    <p className="text-sm font-bold uppercase tracking-widest">Aucune transaction pour le moment</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
