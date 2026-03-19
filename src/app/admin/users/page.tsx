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
    Ban,
    UserPlus,
    Trash2,
    X
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/Modal";

type Profile = {
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
    city: string;
    created_at: string;
};

export default function UsersPage() {
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ full_name: "", email: "", role: "vendeur", city: "" });
    const supabase = createClient();

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Fetch users error:", error);
            showToast("Erreur de chargement : Vérifiez vos droits RLS", "error");
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    }

    async function handleAddUser(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await supabase.from('profiles').insert([
            { ...newUser, status: 'Actif' }
        ]);

        if (error) {
            showToast("Erreur lors de l'ajout : " + error.message, "error");
        } else {
            showToast("Utilisateur ajouté avec succès", "success");
            setIsAddModalOpen(false);
            setNewUser({ full_name: "", email: "", role: "vendeur", city: "" });
            fetchUsers();
        }
    }

    async function toggleBan(user: Profile) {
        const newStatus = user.status === 'Suspendu' ? 'Actif' : 'Suspendu';
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', user.id);

        if (error) {
            showToast("Erreur lors de la modification du statut", "error");
        } else {
            showToast(newStatus === 'Suspendu' ? "Utilisateur suspendu" : "Utilisateur réactivé", "success");
            fetchUsers();
        }
    }

    async function deleteUser(id: string) {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) {
            showToast("Erreur lors de la suppression", "error");
        } else {
            showToast("Utilisateur supprimé", "success");
            fetchUsers();
        }
    }

    const filteredUsers = users.filter(u => 
        u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-10">
            {/* Header Area */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                        Répertoire <span className="text-primary tracking-tighter">Utilisateurs</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest text-balance">Modération globale et gestion des accès utilisateurs</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10"
                >
                    <UserPlus size={16} />
                    Ajouter un utilisateur
                </button>
            </header>

            {/* Stats Cards for Users */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Citoyens", count: users.filter(u => u.role === 'vendeur').length, color: "text-blue-500" },
                    { label: "Collecteurs", count: users.filter(u => u.role === 'collecteur').length, color: "text-amber-500" },
                    { label: "Agents", count: users.filter(u => u.role === 'agent_collecteur').length, color: "text-emerald-500" },
                    { label: "Bannis", count: users.filter(u => u.status === 'Suspendu').length, color: "text-red-500" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 px-6 py-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:scale-[1.02]">
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
               {loading ? (
                   <div className="flex justify-center p-20">
                       <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                   </div>
               ) : (
                filteredUsers.map((user) => (
                   <div key={user.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center gap-6 group hover:border-primary/30 transition-all">
                       <div className="flex items-center gap-5 flex-1">
                           <div className="relative">
                                <div className="w-14 h-14 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
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
                                   {user.full_name}
                                   <span className="text-[9px] font-black text-primary px-1.5 py-0.5 bg-primary/10 rounded uppercase tracking-widest">{user.role}</span>
                               </p>
                               <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                   <p className="text-xs text-gray-400 font-bold flex items-center gap-1.5 leading-none">
                                       <Mail size={12} /> {user.email}
                                   </p>
                                   <p className="text-xs text-gray-400 font-bold flex items-center gap-1.5 leading-none">
                                       <Calendar size={12} /> {new Date(user.created_at).toLocaleDateString()}
                                   </p>
                               </div>
                           </div>
                       </div>

                       <div className="lg:pr-8 flex items-center justify-between lg:justify-end gap-x-8">
                           <div className="text-right">
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Zone</p>
                               <p className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none">{user.city || 'N/A'}</p>
                           </div>
                           <div className="text-right">
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Etat</p>
                               <span className={cn(
                                   "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full leading-none",
                                   user.status === 'Actif' || user.status === 'Vérifié' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                               )}>
                                   {user.status}
                               </span>
                           </div>
                           <div className="flex items-center gap-2 ml-4">
                               <button 
                                   onClick={() => toggleBan(user)}
                                   className={cn(
                                       "p-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl transition-all",
                                       user.status === 'Suspendu' ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                                   )} 
                                   title={user.status === 'Suspendu' ? "Réactiver" : "Suspendre"}
                               >
                                   <Ban size={18} />
                               </button>
                               <button 
                                    onClick={() => deleteUser(user.id)}
                                    className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                >
                                   <Trash2 size={18} />
                               </button>
                               <button className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-gray-400 hover:text-primary transition-all">
                                   <MoreVertical size={18} />
                               </button>
                           </div>
                       </div>
                   </div>
                )))}
            </section>

            {/* Add User Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Ajouter un Utilisateur"
            >
                <form onSubmit={handleAddUser} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom Complet</label>
                        <input 
                            required
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all"
                            value={newUser.full_name}
                            onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Email</label>
                        <input 
                            required
                            type="email"
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all"
                            value={newUser.email}
                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Rôle</label>
                            <select 
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                value={newUser.role}
                                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                            >
                                <option value="vendeur">Citoyen</option>
                                <option value="collecteur">Collecteur</option>
                                <option value="agent_collecteur">Agent</option>
                                <option value="entreprise">Entreprise</option>
                                <option value="mairie">Mairie</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Ville</label>
                            <input 
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all"
                                value={newUser.city}
                                onChange={(e) => setNewUser({...newUser, city: e.target.value})}
                            />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        className="w-full py-5 bg-gray-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10 mt-4"
                    >
                        Créer le profil
                    </button>
                </form>
            </Modal>
        </div>
    );
}

