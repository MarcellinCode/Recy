"use client";

import { useState, useEffect } from "react";
import { 
    Wallet, 
    TrendingUp, 
    ArrowUpRight, 
    ArrowDownLeft, 
    CreditCard, 
    History, 
    Plus, 
    ArrowRight,
    Loader2,
    Leaf,
    ShieldCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { navigateSafe } from "@/utils/navigation";
import { walletService } from "@/services/walletService";
import { userService } from "@/services/userService";
import { cn } from "@/lib/utils";

export default function WalletPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [totalWeight, setTotalWeight] = useState(0);

    useEffect(() => {
        const fetchWalletData = async () => {
            setLoading(true);
            try {
                const profile = await userService.getCurrentProfile();
                if (!profile) {
                    navigateSafe(router, ROUTES.CONNEXION);
                    return;
                }

                const data = await walletService.getWalletData(profile.id);
                setProfile(data.profile);
                setTransactions(data.transactions);
                setTotalWeight(data.totalWeight);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchWalletData();
    }, [router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Ouverture du coffre-fort...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 mb-20 md:mb-0">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic flex items-center gap-3">
                        <Wallet className="w-10 h-10 text-primary" />
                        Mon <span className="text-primary">Wallet</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-3 font-medium">
                        Gérez vos gains issus du recyclage et suivez votre impact.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">
                        <Plus className="w-4 h-4" />
                        Déposer
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 text-gray-900 dark:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:border-primary transition-all shadow-sm">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Retirer
                    </button>
                </div>
            </div>

            {/* Main Balance Card */}
            <div className="relative group overflow-hidden">
                <div className="absolute inset-0 bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
                <div className="relative bg-zinc-900 dark:bg-black p-10 md:p-14 rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <TrendingUp className="w-64 h-64 text-primary" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row gap-12 items-start md:items-center justify-between">
                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3" />
                                Solde Sécurisé
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-7xl md:text-8xl font-black text-white tracking-tighter italic">
                                    {profile?.wallet_balance?.toLocaleString('fr-FR')}
                                </span>
                                <span className="text-2xl font-black text-primary uppercase italic">CFA</span>
                            </div>
                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] text-white font-bold uppercase tracking-widest">Compte vérifié</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Total Recyclé</p>
                                <p className="text-3xl font-black text-white italic">{totalWeight} <span className="text-xs">KG</span></p>
                            </div>
                            <div className="p-6 bg-primary/20 rounded-3xl border border-primary/20 backdrop-blur-md">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Eco-Points</p>
                                <p className="text-3xl font-black text-white italic">{profile?.eco_points || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-2">
                            <History className="w-6 h-6 text-primary" />
                            Activités Récentes
                        </h2>
                        <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                            Voir tout <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {transactions.length > 0 ? (
                            transactions.map((tx) => (
                                <div key={tx.id} className="group bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-zinc-800 hover:border-primary/30 transition-all flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                                            tx.type === 'income' ? "bg-green-100 dark:bg-green-500/10 text-green-600" : 
                                            tx.type === 'outcome' ? "bg-red-100 dark:bg-red-500/10 text-red-600" :
                                            "bg-blue-100 dark:bg-blue-500/10 text-blue-600"
                                        )}>
                                            {tx.type === 'income' ? <ArrowDownLeft className="w-7 h-7" /> : 
                                             tx.type === 'outcome' ? <ArrowUpRight className="w-7 h-7" /> :
                                             <Wallet className="w-7 h-7" />}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-widest">{tx.description}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                                                {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "text-lg font-black italic",
                                            tx.type === 'income' ? "text-green-600" : 
                                            tx.type === 'outcome' ? "text-red-600" : 
                                            "text-gray-900 dark:text-white"
                                        )}>
                                            {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('fr-FR')} <span className="text-[10px]">CFA</span>
                                        </p>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Complété</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 italic bg-gray-50/50 dark:bg-zinc-900/50 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-zinc-800">
                                <History className="w-12 h-12 mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest">Aucune transaction pour le moment</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-2">
                        <Leaf className="w-6 h-6 text-primary" />
                        Impact
                    </h2>
                    <div className="bg-primary p-8 rounded-[3rem] text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
                            <Leaf className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-80">CO2 Évité</p>
                            <p className="text-6xl font-black tracking-tighter italic mb-4">
                                {Math.round(totalWeight * 2.5)} <span className="text-lg">KG</span>
                            </p>
                            <p className="text-xs font-medium leading-relaxed opacity-90 italic">
                                Vos efforts de recyclage ont permis d'éviter l'équivalent de {(totalWeight * 10).toFixed(0)} km en voiture. Continuez !
                            </p>
                            <div className="mt-8 pt-8 border-t border-white/20">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Rang : Éco-Warrior</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">85%</span>
                                </div>
                                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white rounded-full w-[85%]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6">
                        <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Conseils Gain</h4>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                    <Plus className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 leading-normal">
                                    Le tri sélectif augmente la valeur de vos lots de <span className="text-primary">15%</span>.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 leading-normal">
                                    Les métaux sont actuellement en hausse de <span className="text-primary">8%</span> sur le marché.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
