"use client";

import { 
    Search, 
    Filter, 
    MoreVertical, 
    Shield, 
    User,
    Mail,
    Phone,
    Calendar,
    ChevronDown,
    BadgeCheck,
    Ban
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const USERS = [
    { id: 1, name: "Jean Dupont", email: "jean@example.com", role: "Vendeur", status: "Actif", city: "Abidjan", joined: "12 Déc 2023" },
    { id: 2, name: "Marc Traoré", email: "marc.t@collect.ci", role: "Collecteur", status: "Vérifié", city: "Bouaké", joined: "05 Jan 2024" },
    { id: 3, name: "Sali Diarra", email: "sali@service.fr", role: "Agent", status: "Actif", city: "Cocody", joined: "18 Fév 2024" },
    { id: 4, name: "Paul Koffi", email: "paul@koffi.ci", role: "Vendeur", status: "Suspendu", city: "Korhogo", joined: "22 Fév 2024" },
];

export default function UsersPage() {
    const [search, setSearch] = useState("");

    return (
        <div className="space-y-10">
            {/* Header Area */}
            <header>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                    Répertoire <span className="text-primary tracking-tighter">Utilisateurs</span>
                </h1>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest text-balance">Modération globale et gestion des accès utilisateurs</p>
            </header>

            {/* Stats Cards for Users */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Citoyens", count: "24,500", color: "text-blue-500" },
                    { label: "Collecteurs", count: "1,200", color: "text-amber-500" },
                    { label: "Agents", count: "850", color: "text-emerald-500" },
                    { label: "Bannis", count: "42", color: "text-red-500" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 px-6 py-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className={cn("text-xl font-black italic tracking-tighter", stat.color)}>{stat.count}</p>
                    </div>
                ))}
            </div>

            {/* Search & Bulk Actions */}
            <section className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 relative w-full group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Chercher un nom, email ou ville..." 
                        className="w-full pl-14 pr-6 py-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500">
                        Rôle <ChevronDown size={14} />
                    </button>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500">
                        Statut <ChevronDown size={14} />
                    </button>
                </div>
            </section>

            {/* Users List */}
            <section className="space-y-4">
               {USERS.map((user) => (
                   <div key={user.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center gap-6 group hover:border-primary/30 transition-all">
                       <div className="flex items-center gap-5 flex-1">
                           <div className="relative">
                                <div className="w-14 h-14 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden">
                                     <User size={28} className="text-gray-400" />
                                </div>
                                {user.status === 'Vérifié' && (
                                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-900 rounded-full p-0.5">
                                        <BadgeCheck size={20} className="text-blue-500 fill-blue-50" />
                                    </div>
                                )}
                           </div>
                           <div className="min-w-0">
                               <p className="text-base font-black text-gray-900 dark:text-white uppercase leading-none mb-1.5 flex items-center gap-2">
                                   {user.name}
                                   <span className="text-[9px] font-black text-primary px-1.5 py-0.5 bg-primary/10 rounded uppercase tracking-widest">{user.role}</span>
                               </p>
                               <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                   <p className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                                       <Mail size={12} /> {user.email}
                                   </p>
                                   <p className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                                       <Calendar size={12} /> {user.joined}
                                   </p>
                               </div>
                           </div>
                       </div>

                       <div className="lg:pr-8 flex items-center justify-between lg:justify-end gap-x-8">
                           <div className="text-right">
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Zone</p>
                               <p className="text-xs font-black text-gray-900 dark:text-white uppercase">{user.city}</p>
                           </div>
                           <div className="text-right">
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Etat</p>
                               <span className={cn(
                                   "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                   user.status === 'Actif' || user.status === 'Vérifié' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                               )}>
                                   {user.status}
                               </span>
                           </div>
                           <div className="flex items-center gap-2 ml-4">
                               <button className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-gray-400 hover:text-red-500 transition-colors" title="Suspendre l'accès">
                                   <Ban size={18} />
                               </button>
                               <button className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-gray-400 hover:text-primary transition-colors">
                                   <MoreVertical size={18} />
                               </button>
                           </div>
                       </div>
                   </div>
               ))}
            </section>
        </div>
    );
}
