"use client";

import { useState, useEffect } from "react";
import { TrendingUp, BarChart3, Info, ArrowUpRight, ArrowDownRight, Loader2, Package } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function BoursePage() {
    const supabase = createClient();
    const [wasteTypes, setWasteTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrices = async () => {
            const { data } = await supabase.from('waste_types').select('*').order('price_per_kg', { ascending: false });
            setWasteTypes(data || []);
            setLoading(false);
        };
        fetchPrices();
    }, [supabase]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Analyse du cours des matières...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-12">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-4 mb-2 tracking-tighter uppercase italic">
                    <TrendingUp className="w-10 h-10 text-primary" />
                    Bourse <span className="text-primary">Recy</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest pl-14">
                    Cours officiel des matières recyclables au Bénin / Côte d'Ivoire
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {wasteTypes.map((type) => (
                    <div key={type.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-100/50 dark:shadow-none transition-all hover:scale-[1.02] group">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="text-4xl group-hover:scale-110 transition-transform">{type.emoji}</div>
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-widest">{type.name}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold">Matière première</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-green-500 bg-green-50 dark:bg-green-950/20 px-3 py-1 rounded-full">
                                <ArrowUpRight className="w-3 h-3" />
                                <span className="text-[10px] font-black tracking-tighter">+2.4%</span>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-primary">{type.price_per_kg}</span>
                            <span className="text-xs font-black text-gray-400 uppercase">FCFA / KG</span>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-50 dark:border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-gray-300" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Stabilité : Haute</span>
                            </div>
                            <Package className="w-4 h-4 text-gray-200" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/10 p-10 rounded-[3rem] border border-amber-100/50 dark:border-amber-900/20 flex flex-col md:flex-row gap-8 items-center">
                <div className="w-16 h-16 rounded-[1.5rem] bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Info className="w-8 h-8 text-amber-600" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-black text-amber-900 dark:text-amber-200 mb-2 uppercase tracking-tight">Comment sont fixés les prix ?</h3>
                    <p className="text-sm text-amber-800/80 dark:text-amber-400/80 leading-relaxed font-bold italic">
                        Les prix affichés sont révisés quotidiennement en fonction du marché international des matières premières et des coûts logistiques locaux. Ces tarifs servent de base de calcul pour vos transactions sur la plateforme.
                    </p>
                </div>
                <button className="px-8 py-4 bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-600/20 hover:scale-[1.05] transition-all">
                    En savoir plus
                </button>
            </div>
        </div>
    );
}
