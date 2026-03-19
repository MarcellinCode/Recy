"use client";

import { 
    Save, 
    Plus, 
    Trash2, 
    Banknote, 
    Settings, 
    ShieldCheck, 
    Zap,
    RefreshCw,
    CircleEllipsis
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const WASTE_TYPES = [
    { id: 1, name: "Plastique HDPE", price: 150, emoji: "🧴", status: "Actif" },
    { id: 2, name: "Aluminium", price: 400, emoji: "🥫", status: "Actif" },
    { id: 3, name: "Papier / Carton", price: 50, emoji: "📦", status: "Actif" },
    { id: 4, name: "Verre", price: 30, emoji: "🍾", status: "Inactif" },
];

export default function SettingsPage() {
    return (
        <div className="space-y-12 pb-20">
            {/* Header Area */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                        Configuration <span className="text-primary tracking-tighter">Système</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Paramètres globaux de l'économie circulaire CITICLINE</p>
                </div>
                <button className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/20">
                    <Save size={16} />
                    Enregistrer tout
                </button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* section: Tarification & Matériaux */}
                <div className="xl:col-span-2 space-y-8">
                    <section className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-2xl flex items-center justify-center text-amber-600">
                                    <Banknote size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">Tarifs des Matériaux</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Rémunération par Kg (FCFA)</p>
                                </div>
                            </div>
                            <button className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl text-primary hover:bg-primary/10 transition-colors">
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {WASTE_TYPES.map((type) => (
                                <div key={type.id} className="group flex items-center gap-6 p-6 bg-gray-50/50 dark:bg-zinc-800/30 rounded-3xl border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 transition-all">
                                    <div className="w-14 h-14 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                                        {type.emoji}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{type.name}</p>
                                            <span className={cn(
                                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                                                type.status === 'Actif' ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-500"
                                            )}>{type.status}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                defaultValue={type.price}
                                                className="w-24 bg-transparent border-b border-gray-200 dark:border-zinc-700 text-lg font-black text-primary focus:border-primary outline-none"
                                            />
                                            <span className="text-[10px] font-black text-gray-400 uppercase">FCFA / Kg</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                                            <CircleEllipsis size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-gray-900 p-10 rounded-[3rem] shadow-2xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary">
                                <Zap size={24} />
                            </div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Optimisation Réseau</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Seuil de retrait minimum</p>
                                <div className="flex items-center gap-3">
                                    <input type="text" defaultValue="5 000" className="bg-transparent text-2xl font-black text-white outline-none w-32 border-b border-white/20" />
                                    <span className="text-sm font-bold text-gray-500 uppercase">FCFA</span>
                                </div>
                            </div>
                            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Comission plateforme</p>
                                <div className="flex items-center gap-3">
                                    <input type="text" defaultValue="5" className="bg-transparent text-2xl font-black text-white outline-none w-16 border-b border-white/20" />
                                    <span className="text-sm font-bold text-gray-500 uppercase">%</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar Settings */}
                <div className="space-y-8">
                    <section className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl flex items-center justify-center text-indigo-600">
                                <ShieldCheck size={20} />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight italic">Sécurité Globale</h2>
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 cursor-pointer">
                                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Double Authentification</span>
                                <div className="w-10 h-5 bg-primary/20 rounded-full relative">
                                    <div className="absolute right-1 top-1 w-3 h-3 bg-primary rounded-full" />
                                </div>
                            </label>
                            <label className="flex items-center justify-between p-4 cursor-pointer opacity-50">
                                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Maintenance Mode</span>
                                <div className="w-10 h-5 bg-gray-200 rounded-full relative">
                                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                                </div>
                            </label>
                        </div>
                    </section>

                    <section className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-xl shadow-indigo-600/20">
                        <RefreshCw size={32} className="mb-6 opacity-40 animate-spin" style={{ animationDuration: '8s' }} />
                        <h3 className="text-lg font-black uppercase italic mb-2 tracking-tight">Version du Core</h3>
                        <p className="text-xs font-bold opacity-60 uppercase tracking-[0.2em] mb-6">Build 3.42.0 (Stable)</p>
                        <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-opacity-90 transition-all">
                            Vérifier les mises à jour
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}
