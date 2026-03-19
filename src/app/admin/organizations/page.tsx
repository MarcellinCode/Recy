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
    School,
    Ban,
    Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";

type Organization = {
    id: string;
    full_name: string;
    role: string;
    city: string;
    status: string;
    created_at: string;
};

export default function OrganizationsPage() {
    const [search, setSearch] = useState("");
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchOrgs();
    }, []);

    async function fetchOrgs() {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['mairie', 'entreprise'])
            .order('created_at', { ascending: false });
        
        if (error) {
            showToast("Erreur lors du chargement des organisations", "error");
        } else {
            setOrgs(data || []);
        }
        setLoading(false);
    }

    async function handleStatusChange(org: Organization, newStatus: string) {
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', org.id);

        if (error) {
            showToast("Erreur lors de la mise à jour", "error");
        } else {
            showToast(`Organisation ${newStatus.toLowerCase()} avec succès`);
            fetchOrgs();
        }
    }

    async function deleteOrg(id: string) {
        if (!confirm("Supprimer cette organisation ?")) return;
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) showToast("Erreur lors de la suppression", "error");
        else {
            showToast("Organisation supprimée");
            fetchOrgs();
        }
    }

    const filteredOrgs = orgs.filter(o => o.full_name?.toLowerCase().includes(search.toLowerCase()));

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
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Statut</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                         <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : (
                                filteredOrgs.map((org) => (
                                <tr key={org.id} className="group hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600">
                                                {org.role === 'mairie' ? <School size={20} /> : <Building2 size={20} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase leading-none mb-1">{org.full_name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Inscrit le {new Date(org.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest",
                                            org.role === 'mairie' ? "text-indigo-500" : "text-amber-500"
                                        )}>
                                            {org.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <MapPin size={14} />
                                            <span className="text-xs font-bold uppercase tracking-wider">{org.city || 'N/A'}</span>
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
                                                <button 
                                                    onClick={() => handleStatusChange(org, 'Actif')}
                                                    className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors" 
                                                    title="Approuver"
                                                >
                                                    <CheckCircle2 size={18} />
                                                </button>
                                            )}
                                            {org.status === 'Actif' && (
                                                <button 
                                                    onClick={() => handleStatusChange(org, 'Suspendu')}
                                                    className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" 
                                                    title="Suspendre"
                                                >
                                                    <Ban size={18} />
                                                </button>
                                            )}
                                             <button 
                                                onClick={() => deleteOrg(org.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

