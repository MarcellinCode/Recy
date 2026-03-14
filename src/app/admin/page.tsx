"use client";

import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Banknote, BarChart3, ShieldAlert, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export default function AdminPage() {
    const stats = [
        { label: "Utilisateurs", value: "1,250", icon: <Users className="w-5 h-5" />, color: "bg-blue-500" },
        { label: "Poids Collecté", value: "4.8 Tons", icon: <BarChart3 className="w-5 h-5" />, color: "bg-primary" },
        { label: "Transactions", value: "850,000 FCFA", icon: <Banknote className="w-5 h-5" />, color: "bg-amber-500" },
    ];

    const verificationRequests = [
        { id: 1, name: "Alpha Collect SARL", type: "Collecteur", city: "Abidjan", status: "pending" },
        { id: 2, name: "Recup Ivoire", type: "Collecteur", city: "Yamoussoukro", status: "pending" },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center">
                    <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Admin WaveClean</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Tableau de bord de gestion</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center gap-6">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", stat.color)}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Verification Requests */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-amber-500" />
                            Vérifications en attente
                        </h2>
                        <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black">{verificationRequests.length} NOUVEAU</span>
                    </div>

                    <div className="space-y-4">
                        {verificationRequests.map((req) => (
                            <div key={req.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">{req.name}</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{req.type} • {req.city}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 bg-white dark:bg-zinc-800 text-green-500 rounded-xl hover:bg-green-50 transition-colors shadow-sm">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                    <button className="p-2 bg-white dark:bg-zinc-800 text-red-500 rounded-xl hover:bg-red-50 transition-colors shadow-sm">
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Price Management Placeholder */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 p-8 shadow-sm">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-8">
                        <Banknote className="w-5 h-5 text-primary" />
                        Gestion des tarifs (F/_kg)
                    </h2>
                    <div className="space-y-4">
                        {[
                            { name: "Plastique HDPE", price: "150 FCFA" },
                            { name: "Aluminium", price: "400 FCFA" },
                            { name: "Papier / Carton", price: "50 FCFA" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-zinc-800 last:border-0">
                                <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{item.name}</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-black text-gray-900 dark:text-white">{item.price}</span>
                                    <button className="text-primary text-[10px] font-black uppercase tracking-wider hover:underline">Modifier</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}


