"use client";

import { 
    Activity, 
    ArrowLeft, 
    Calendar, 
    Download, 
    Filter, 
    Leaf, 
    TrendingUp, 
    Zap,
    Trash2,
    CheckCircle2,
    BarChart3,
    DollarSign,
    PieChart,
    Layers,
    Clock,
    Printer,
    ArrowUpRight,
    MapPin
} from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

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
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
            {/* Header Sticky */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800 px-6 md:px-12 lg:px-24 py-6">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => router.back()}
                            className="p-3 bg-gray-100 dark:bg-zinc-900 rounded-2xl hover:bg-white transition-all shadow-sm"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black italic tracking-tighter uppercase dark:text-white leading-none mb-1">Rapport <span className="text-primary">Performance Global</span></h1>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Analytique Territoriale & Impact RSE</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white dark:bg-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all">
                            <Download size={14} />
                            Exporter PDF
                        </button>
                        <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-primary/20">
                            <Printer size={14} />
                            Imprimer
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 mt-12 space-y-12">
                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-8 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Total Collecté</p>
                        <p className="text-4xl font-black italic tracking-tighter dark:text-white mb-4">{totalWeight} <span className="text-sm">kg</span></p>
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase">
                            <TrendingUp size={12} />
                            +12% vs mois dernier
                        </div>
                    </div>

                    <div className="p-8 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Impact CO2 Sauvé</p>
                        <p className="text-4xl font-black italic tracking-tighter text-emerald-500 mb-4">{co2Saved} <span className="text-sm">kg</span></p>
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase italic">
                            <Leaf size={12} />
                            Objectif Atteint
                        </div>
                    </div>

                    <div className="p-8 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Salubrité Commune</p>
                        <p className="text-4xl font-black italic tracking-tighter dark:text-white mb-4">84 <span className="text-sm">%</span></p>
                        <div className="w-full h-1 bg-gray-100 dark:bg-zinc-800 rounded-full">
                            <div className="h-full bg-blue-500 w-[84%]" />
                        </div>
                    </div>

                    <div className="p-8 bg-zinc-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 blur-[40px] -mr-12 -mt-12 transition-all group-hover:scale-150" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Éco-taxe Commune</p>
                        <p className="text-4xl font-black italic tracking-tighter text-white mb-4">{totalEcoTax.toLocaleString()} <span className="text-sm">CFA</span></p>
                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Revenus territoriaux directs</p>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Weight Breakdown */}
                    <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-10 flex items-center gap-3">
                            <PieChart className="text-primary" />
                            Répartition des Flux
                        </h3>
                        <div className="space-y-6">
                            {weightByCategory.map((cat, i) => (
                                <div key={cat.name} className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-zinc-500">{cat.name}</span>
                                        <span className="dark:text-white">{cat.weight} kg</span>
                                    </div>
                                    <div className="h-3 bg-gray-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(cat.weight / (totalWeight || 1)) * 100}%` }}
                                            className={cn(
                                                "h-full",
                                                i === 0 ? "bg-primary" : i === 1 ? "bg-emerald-500" : i === 2 ? "bg-blue-500" : i === 3 ? "bg-amber-500" : "bg-zinc-400"
                                            )}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial History */}
                    <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm">
                         <h3 className="text-xl font-black uppercase italic tracking-tighter mb-10 flex items-center gap-3">
                            <Layers className="text-primary" />
                            Historique des Taxes
                        </h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 scrollbar-hide">
                            {transactions.length === 0 && <p className="text-center text-zinc-400 text-xs py-10 uppercase font-black">Aucune transaction enregistrée</p>}
                            {transactions.map((tx) => (
                                <div key={tx.id} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex justify-between items-center group transition-all hover:bg-primary/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <DollarSign size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest dark:text-white">{tx.description || "Taxes de salubrité"}</p>
                                            <p className="text-[8px] font-bold text-zinc-400 uppercase">{new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                    <p className="text-md font-black italic tracking-tighter text-emerald-500">+{Number(tx.amount).toLocaleString()} CFA</p>
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
                        <button className="px-10 py-5 bg-white text-primary rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">Planifier une réunion</button>
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
