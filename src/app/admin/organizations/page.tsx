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
    Trash2,
    ExternalLink,
    Activity
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/Modal";
import { setUserStatus, updateUserProfile, createUserAccount, deleteUserAccount } from "@/app/actions/admin";
import Link from "next/link";

type Organization = {
    id: string;
    full_name: string;
    role: string;
    city: string;
    status: string;
    subscription_tier?: string;
    official_department?: string;
    created_at: string;
};

export default function OrganizationsPage() {
    const [search, setSearch] = useState("");
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [newOrg, setNewOrg] = useState({ full_name: "", email: "", role: "organisation_admin", city: "" });
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchOrgs();
    }, []);

    async function fetchOrgs() {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['mairie', 'organisation_admin'])
            .order('created_at', { ascending: false });
        
        if (error) {
            showToast("Erreur lors du chargement des organisations", "error");
        } else {
            setOrgs(data || []);
        }
        setLoading(false);
    }

    async function handleAddOrg(e: React.FormEvent) {
        e.preventDefault();
        const res = await createUserAccount(newOrg);

        if (!res.success) {
            showToast("Erreur lors de l'ajout : " + res.error, "error");
        } else {
            showToast("Organisation ajoutée avec succès", "success");
            if (res.password) setCreatedCredentials({ email: newOrg.email, password: res.password });
            setIsAddModalOpen(false);
            setNewOrg({ full_name: "", email: "", role: "organisation_admin", city: "" });
            fetchOrgs();
        }
    }

    async function handleStatusChange(org: Organization, newStatus: string) {
        const res = await setUserStatus(org.id, newStatus as "Actif" | "Suspendu" | "En attente");

        if (!res.success) {
            showToast("Erreur lors de la mise à jour : " + res.error, "error");
        } else {
            showToast(`Organisation ${newStatus.toLowerCase()} avec succès`);
            fetchOrgs();
        }
    }

    async function deleteOrg(id: string) {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette organisation ? Cette action est irréversible.")) return;
        const res = await deleteUserAccount(id);
        if (!res.success) showToast("Erreur lors de la suppression : " + res.error, "error");
        else {
            showToast("Organisation supprimée avec succès", "success");
            fetchOrgs();
        }
    }

    async function handleUpdateOrg(e: React.FormEvent) {
        e.preventDefault();
        if (!editingOrg) return;

        const res = await updateUserProfile(editingOrg.id, {
            full_name: editingOrg.full_name,
            role: editingOrg.role,
            city: editingOrg.city,
            status: editingOrg.status
        });

        if (!res.success) {
            showToast("Erreur lors de la mise à jour : " + res.error, "error");
        } else {
            showToast("Organisation mise à jour", "success");
            setEditingOrg(null);
            fetchOrgs();
        }
    }

    const filteredOrgs = orgs.filter(o => o.full_name?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-10">
            {createdCredentials && (
                <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-800">Compte créé — identifiants à transmettre (affichés une seule fois)</p>
                        <p className="font-mono text-sm mt-2 select-all">{createdCredentials.email}</p>
                        <p className="font-mono text-sm select-all">{createdCredentials.password}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { navigator.clipboard?.writeText(`Identifiant : ${createdCredentials.email}\nMot de passe : ${createdCredentials.password}`).catch(() => {}); showToast("Identifiants copiés", "success"); }}
                            className="px-4 py-2 rounded-xl bg-white border border-emerald-200 text-[10px] font-black uppercase tracking-widest"
                        >Copier</button>
                        <button
                            onClick={() => setCreatedCredentials(null)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest"
                        >Fermer</button>
                    </div>
                </div>
            )}
            {/* Header Area */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                        Gestion des <span className="text-primary tracking-tighter">Organisations</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Contrôle et validation des partenaires institutionnels</p>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    <a 
                        href="/connexion"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all shadow-sm"
                        title="Se connecter en tant que partenaire"
                    >
                        <ExternalLink size={16} />
                        Portail Partenaire
                    </a>
                    <Link 
                        href="/admin/add-mairie"
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/10"
                    >
                        <School size={16} />
                        Ajouter une Mairie
                    </Link>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10"
                    >
                        <Plus size={16} />
                        Nouvelle Organisation
                    </button>
                </div>
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
                                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase leading-none mb-1 flex items-center gap-2">
                                                    {org.full_name}
                                                    {org.subscription_tier && org.subscription_tier !== 'standard' && (
                                                        <span className="text-[8px] font-black text-amber-600 px-1.5 py-0.5 bg-amber-50 rounded uppercase tracking-widest border border-amber-100 italic">★ {org.subscription_tier}</span>
                                                    )}
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Inscrit le {new Date(org.created_at).toLocaleDateString()}</p>
                                                    {org.official_department && (
                                                        <span className="text-[8px] font-black text-primary uppercase tracking-widest italic border-l border-gray-100 pl-2">{org.official_department}</span>
                                                    )}
                                                </div>
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusChange(org, 'Actif');
                                                    }}
                                                    className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors" 
                                                    title="Approuver l'organisation"
                                                >
                                                    <CheckCircle2 size={18} />
                                                </button>
                                            )}
                                            {org.status === 'Actif' && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusChange(org, 'Suspendu');
                                                    }}
                                                    className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" 
                                                    title="Suspendre l'organisation"
                                                >
                                                    <Ban size={18} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteOrg(org.id);
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                                title="Supprimer définitivement"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            {org.role === 'mairie' && (
                                                <>
                                                    <Link 
                                                        href={`/city-os?id=${org.id}`}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors"
                                                        title="Dashboard Interne"
                                                    >
                                                        <Activity size={18} />
                                                    </Link>
                                                    <a 
                                                        href={`/mairie/${org.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title="Voir la Page Landing"
                                                    >
                                                        <ExternalLink size={18} />
                                                    </a>
                                                </>
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingOrg(org);
                                                }}
                                                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                                title="Modifier l'organisation"
                                            >
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
            {/* Add Organization Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Ajouter une Organisation"
            >
                <form onSubmit={handleAddOrg} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom de l'Organisation / Mairie</label>
                        <input 
                            required
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all font-black uppercase tracking-tight"
                            placeholder="Ex: MAIRIE DE COCODY..."
                            value={newOrg.full_name}
                            onChange={(e) => setNewOrg({...newOrg, full_name: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Email de connexion</label>
                        <input
                            required
                            type="email"
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all"
                            placeholder="contact@organisation.ci"
                            value={newOrg.email}
                            onChange={(e) => setNewOrg({...newOrg, email: e.target.value})}
                        />
                        <p className="text-[9px] text-zinc-400 ml-4">Pour une Mairie avec son territoire cartographié, préférez « Ajouter une Mairie ».</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Type</label>
                            <select 
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                value={newOrg.role}
                                onChange={(e) => setNewOrg({...newOrg, role: e.target.value})}
                            >
                                <option value="organisation_admin">Organisation (SME)</option>
                                <option value="mairie">Mairie</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Ville / Zone</label>
                            <input 
                                required
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all"
                                placeholder="Abidjan"
                                value={newOrg.city}
                                onChange={(e) => setNewOrg({...newOrg, city: e.target.value})}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="w-full py-5 bg-gray-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10 mt-4"
                    >
                        Créer le Partenaire
                    </button>
                </form>
            </Modal>

            {/* Edit Organization Modal */}
            <Modal
                isOpen={!!editingOrg}
                onClose={() => setEditingOrg(null)}
                title="Modifier l'Organisation"
            >
                {editingOrg && (
                    <form onSubmit={handleUpdateOrg} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom de l'Organisation / Mairie</label>
                            <input 
                                required
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all font-black uppercase tracking-tight"
                                value={editingOrg.full_name}
                                onChange={(e) => setEditingOrg({...editingOrg, full_name: e.target.value})}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Type</label>
                                <select 
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all appearance-none cursor-pointer font-black"
                                    value={editingOrg.role}
                                    onChange={(e) => setEditingOrg({...editingOrg, role: e.target.value})}
                                >
                                    <option value="mairie">Mairie</option>
                                                                        <option value="organisation_admin">Organisation (SME)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Statut</label>
                                <select 
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all appearance-none cursor-pointer font-black"
                                    value={editingOrg.status}
                                    onChange={(e) => setEditingOrg({...editingOrg, status: e.target.value})}
                                >
                                    <option value="Actif">Actif</option>
                                    <option value="Suspendu">Suspendu</option>
                                    <option value="En attente">En attente</option>
                                </select>
                            </div>
                        </div>

                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Ville / Zone</label>
                            <input 
                                required
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all font-black uppercase"
                                value={editingOrg.city || ""}
                                onChange={(e) => setEditingOrg({...editingOrg, city: e.target.value})}
                            />
                        </div>

                        <button 
                            type="submit"
                            className="w-full py-5 bg-primary text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/10 mt-4"
                        >
                            Enregistrer les modifications
                        </button>
                    </form>
                )}
            </Modal>
        </div>
    );
}

