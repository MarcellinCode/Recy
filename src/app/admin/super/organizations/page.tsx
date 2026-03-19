"use client";

import { 
    Search, 
    Filter, 
    MoreVertical, 
    CheckCircle2, 
    XCircle, 
    Building2,
    MapPin,
    Users,
    ChevronRight,
    Plus,
    School
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ORGS = [
    { id: 1, name: "Mairie de Cocody", type: "Mairie", city: "Abidjan", status: "Actif", agents: 34, joined: "12 Mars 2024" },
    { id: 2, name: "Eco-Collect CI", type: "Entreprise", city: "Abidjan", status: "En attente", agents: 8, joined: "15 Mars 2024" },
    { id: 3, name: "Mairie de Bouaké", type: "Mairie", city: "Bouaké", status: "Actif", agents: 21, joined: "10 Fév 2024" },
    { id: 4, name: "Recup Ivoire", type: "Entreprise", city: "San Pédro", status: "Suspendu", agents: 15, joined: "05 Jan 2024" },
];

export default function OrganizationsPage() {
    const [search, setSearch] = useState("");

    return (
        <div className="space-y-10">
            {/* Header Area */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                        Gestion des <span className="text-primary tracking-tighter">Organisations</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Contrôle et validation des partenaires institutionnels</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10">
                    <Plus size={16} />
                    Nouvelle Organisation
                </button>
            </header>

            {/* Filters & Search */}
            <section className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher une mairie ou entreprise..." 
                        className="w-full pl-14 pr-6 py-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500">
                        <Filter size={16} />
                        Filtres
                    </button>
                </div>
            </section>

            {/* Organizations Grid/Table */}
            <section className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-50 dark:border-zinc-800/50">
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Organisation</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Type</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Localisation</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Effectif</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Statut</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                            {ORGS.map((org) => (
                                <tr key={org.id} className="group hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600">
                                                {org.type === 'Mairie' ? <School size={20} /> : <Building2 size={20} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase leading-none mb-1">{org.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Inscrit le {org.joined}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest",
                                            org.type === 'Mairie' ? "text-indigo-500" : "text-amber-500"
                                        )}>
                                            {org.type}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <MapPin size={14} />
                                            <span className="text-xs font-bold uppercase tracking-wider">{org.city}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Users size={14} />
                                            <span className="text-xs font-bold">{org.agents} Agents</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            org.status === 'Actif' && "bg-emerald-100 text-emerald-600",
                                            org.status === 'En attente' && "bg-amber-100 text-amber-600",
                                            org.status === 'Suspendu' && "bg-red-100 text-red-600"
                                        )}>
                                            {org.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {org.status === 'En attente' && (
                                                <button className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors" title="Valider">
                                                    <CheckCircle2 size={18} />
                                                </button>
                                            )}
                                            <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                                <MoreVertical size={18} />
                                            </button>
                                            <button className="ml-2 w-8 h-8 bg-gray-50 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
