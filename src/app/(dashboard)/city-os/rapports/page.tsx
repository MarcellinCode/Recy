"use client";

import { 
    Activity, 
    ArrowLeft, 
    Download, 
    Leaf, 
    TrendingUp, 
    DollarSign, 
    PieChart, 
    Layers, 
    Printer 
} from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

function getProgressBarColor(index: number): string {
    switch (index) {
        case 0:
            return "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]";
        case 1:
            return "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]";
        case 2:
            return "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]";
        case 3:
            return "bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)]";
        default:
            return "bg-zinc-400";
    }
}

function GlobalRapportContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const targetMairieId = searchParams.get('id');
    const [loading, setLoading] = useState(true);
    const [wastes, setWastes] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, [targetMairieId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const mairieId = targetMairieId || user.id;

            const { data: wastesData } = await supabase
                .from('wastes')
                .select('*, waste_types(*)');

            const { data: txData } = await supabase
                .from('transactions')
                .select('*')
                .eq('profile_id', mairieId);

            setWastes(wastesData || []);
            setTransactions(txData || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const collectedWastes = wastes.filter(w => w.status === 'collected');
    const totalWeight = collectedWastes.reduce((acc, w) => acc + (w.final_weight || w.estimated_weight || 0), 0);
    const co2Saved = (totalWeight * 1.5).toFixed(1);
    const totalEcoTax = transactions.reduce((acc, tx) => acc + (tx.type === 'income' ? Number(tx.amount) : 0), 0);

    const categories = ['Plastique', 'Verre', 'Aluminium', 'Papier / Carton', 'Métal'];
    const weightByCategory = categories.map(cat => ({
        name: cat,
        weight: wastes.filter(w => w.waste_types?.name === cat && w.status === 'collected')
                      .reduce((acc, w) => acc + (w.final_weight || w.estimated_weight || 0), 0)
    }));

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-gray-50 dark:bg-black">
            <Activity className="w-12 h-12 text-primary animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Génération du Rapport Décisionnel...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20 selection:bg-emerald-100">
            {/* Header Sticky - Cockpit Crystal Style */}
            <div className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-zinc-200 px-6 md:px-12 lg:px-24 py-8">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => router.back()}
                            className="p-4 bg-white border border-zinc-200 rounded-2xl hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm group"
                        >
                            <ArrowLeft size={20} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-900 leading-none mb-2">Rapport <span className="text-emerald-500">Performance Global</span></h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Analytique Territoriale & Impact Environnemental</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => globalThis.print()} className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white dark:bg-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all">
                            <Download size={14} />
                            Exporter PDF
                        </button>
                        <button onClick={() => globalThis.print()} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-primary/20">
                            <Printer size={14} />
                            Imprimer
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 mt-12 space-y-12">
                {/* Dashboard Stats - Crystal Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="p-10 bg-white/70 backdrop-blur-xl rounded-[3rem] border border-zinc-200 shadow-xl shadow-zinc-200/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Total Collecté</p>
                        <p className="text-5xl font-black italic tracking-tighter text-zinc-900 mb-6">{totalWeight} <span className="text-xl text-zinc-300">kg</span></p>
                        <div className="flex items-center gap-2 text-[11px] font-black text-emerald-500 uppercase">
                            <TrendingUp size={14} />
                            +12.4% vs MOIS DERNIER
                        </div>
                    </div>

                    <div className="p-10 bg-white/70 backdrop-blur-xl rounded-[3rem] border border-zinc-200 shadow-xl shadow-zinc-200/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Impact CO2 Sauvé</p>
                        <p className="text-5xl font-black italic tracking-tighter text-emerald-500 mb-6">{co2Saved} <span className="text-xl text-emerald-200">kg</span></p>
                        <div className="flex items-center gap-2 text-[11px] font-black text-emerald-500 uppercase italic">
                            <Leaf size={14} />
                            OBJECTIF ATTEINT
                        </div>
                    </div>

                    <div className="p-10 bg-white/70 backdrop-blur-xl rounded-[3rem] border border-zinc-200 shadow-xl shadow-zinc-200/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Salubrité Commune</p>
                        <p className="text-5xl font-black italic tracking-tighter text-zinc-900 mb-6">84 <span className="text-xl text-zinc-300">%</span></p>
                        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: '84%' }} className="h-full bg-blue-500 rounded-full" />
                        </div>
                    </div>

                    <div className="p-10 bg-zinc-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 blur-[60px] -mr-20 -mt-20 transition-all group-hover:scale-150" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Éco-taxe Commune</p>
                        <p className="text-5xl font-black italic tracking-tighter text-white mb-6">{totalEcoTax.toLocaleString()} <span className="text-xl text-zinc-600">CFA</span></p>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">REVENUS TERRITORIAUX</p>
                    </div>
                </div>

                {/* Two Column Layout - Analytics & Finance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Weight Breakdown - Crystal Panel */}
                    <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[4rem] border border-zinc-200 shadow-xl shadow-zinc-200/10">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-12 flex items-center gap-4">
                            <PieChart className="text-emerald-500" size={24} />
                            Répartition des Flux
                        </h3>
                        <div className="space-y-8">
                            {weightByCategory.map((cat, i) => (
                                <div key={cat.name} className="space-y-3">
                                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.2em]">
                                        <span className="text-zinc-400">{cat.name}</span>
                                        <span className="text-zinc-900">{cat.weight} kg</span>
                                    </div>
                                    <div className="h-4 bg-zinc-50 rounded-full overflow-hidden shadow-inner">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(cat.weight / (totalWeight || 1)) * 100}%` }}
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                getProgressBarColor(i)
                                            )}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial History - Crystal Panel */}
                    <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[4rem] border border-zinc-200 shadow-xl shadow-zinc-200/10">
                         <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-12 flex items-center gap-4">
                            <Layers className="text-emerald-500" size={24} />
                            Journal des Flux Financiers
                        </h3>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-6 no-scrollbar">
                            {transactions.length === 0 && <p className="text-center text-zinc-300 text-[10px] py-20 uppercase font-black tracking-widest italic">Aucun flux financier détecté localement</p>}
                            {transactions.map((tx) => (
                                <div key={tx.id} className="p-6 bg-white border border-zinc-100 rounded-[2rem] flex justify-between items-center group transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100">
                                            <DollarSign size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-900">{tx.description || "ÉCO-TAXE TERRITORIALE"}</p>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase mt-1">{new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                    <p className="text-lg font-black italic tracking-tighter text-emerald-500">+{Number(tx.amount).toLocaleString()} <span className="text-[10px]">CFA</span></p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Final CTA / Note */}
                <div className="p-12 bg-gradient-to-r from-primary to-blue-600 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -mr-32 -mt-32" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Votre Commune est sur la bonne voie.</h3>
                            <p className="text-white/70 text-sm font-bold uppercase tracking-widest max-w-xl">En continuant cette trajectoire, RecyCla estime une réduction de 45% des dépenses de voirie d'ici 2025.</p>
                        </div>
                        <button onClick={() => showToast("Redirection vers l'agenda...", "success")} className="px-10 py-5 bg-white text-primary rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">Planifier une réunion</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function GlobalRapportPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <GlobalRapportContent />
        </Suspense>
    );
}
