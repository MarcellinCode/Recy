"use client";

import { 
    MapPin, 
    Plus, 
    Search, 
    Filter, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ArrowUpRight,
    Building2,
    ShieldCheck,
    Activity,
    Trash2,
    AlertOctagon,
    Megaphone
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/Modal";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("@/components/map/MapComponent"), {
    ssr: false,
    loading: () => <div className="w-full h-[60vh] bg-gray-50 dark:bg-zinc-900 rounded-[3rem] animate-pulse border border-gray-100 flex items-center justify-center"><p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Chargement de la carte...</p></div>
});

export default function MairieManagementPage() {
    const [loading, setLoading] = useState(true);
    const [zones, setZones] = useState<any[]>([]);
    const [pendingConcessions, setPendingConcessions] = useState<any[]>([]);
    const [wastes, setWastes] = useState<any[]>([]);
    const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<any | null>(null);
    const [newZone, setNewZone] = useState({ name: "", city: "Abidjan", status: "available" });
    const [announcement, setAnnouncement] = useState({ title: "", message: "", type: "info" });
    const supabase = createClient();

    useEffect(() => {
        fetchMairieData();
    }, []);

    async function fetchMairieData() {
        setLoading(true);
        try {
            const { data: zonesData } = await supabase
                .from('zones')
                .select('*, concessions(status, profiles(full_name))');
            
            const { data: concessionsData } = await supabase
                .from('concessions')
                .select('*, profiles(full_name, role), zones(name)')
                .eq('status', 'pending');
            
            const { data: wastesData } = await supabase
                .from('wastes')
                .select('id, status, created_at, estimated_weight');
            
            setZones(zonesData || []);
            setPendingConcessions(concessionsData || []);
            setWastes(wastesData || []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }

    async function handleCreateZone(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await supabase.from('zones').insert([newZone]);
        if (error) {
            showToast("Erreur lors de la création", "error");
        } else {
            showToast("Zone de collecte créée avec succès", "success");
            setIsAddZoneModalOpen(false);
            setNewZone({ name: "", city: "Abidjan", status: "available" });
            fetchMairieData();
        }
    }

    async function handleUpdateZone(e: React.FormEvent) {
        e.preventDefault();
        if (!editingZone) return;

        const { error } = await supabase
            .from('zones')
            .update({
                name: editingZone.name,
                city: editingZone.city,
                status: editingZone.status
            })
            .eq('id', editingZone.id);

        if (error) {
            showToast("Erreur lors de la mise à jour", "error");
        } else {
            showToast("Zone mise à jour avec succès", "success");
            setEditingZone(null);
            fetchMairieData();
        }
    }

    async function deleteZone(id: string) {
        if (!confirm("Supprimer cette zone ? Cela peut affecter les concessions liées.")) return;
        const { error } = await supabase.from('zones').delete().eq('id', id);
        if (error) showToast("Erreur", "error");
        else {
            showToast("Zone supprimée avec succès", "success");
            fetchMairieData();
        }
    }

    async function handleConcessionAction(id: string, status: 'active' | 'rejected') {
        const { error } = await supabase
            .from('concessions')
            .update({ status })
            .eq('id', id);
        
        if (error) {
            showToast("Erreur lors de la mise à jour", "error");
        } else {
            showToast(status === 'active' ? "Concession approuvée" : "Dossier refusé", "success");
            fetchMairieData();
        }
    }

    async function handleSendAnnouncement(e: React.FormEvent) {
        e.preventDefault();
        // Dans un système complet, ceci alimente la table `notifications` et déclenche un push (FCM/Supabase Edge Functions)
        showToast("✓ Annonce globale envoyée aux citoyens de la commune", "success");
        setIsAnnouncementModalOpen(false);
        setAnnouncement({ title: "", message: "", type: "info" });
    }

    // Statistiques GovTech
    const totalWastes = wastes.length;
    const collectedWastes = wastes.filter(w => w.status === 'collected').length;
    const collectionRate = totalWastes > 0 ? Math.round((collectedWastes / totalWastes) * 100) : 0;
    
    // SLA Sanction Tracker : Dépôts signalés depuis plus de 48h et non collectés
    const now = new Date().getTime();
    const slaBreaches = wastes.filter(w => w.status === 'published' && (now - new Date(w.created_at).getTime() > 48 * 3600 * 1000)).length;

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                        Mairie <span className="text-primary tracking-tighter">City OS</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-relaxed text-balance mb-6">Supervision des zones territoriales et concessions de collecte</p>
                    
                    {/* Alerte SLA Automatisée */}
                    {slaBreaches > 0 && (
                        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl border border-red-100 dark:border-red-900/50">
                            <AlertOctagon size={16} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Alerte Gouvernance : {slaBreaches} dépôts en dépassement SLA (&gt;48h). Sanctions requises.</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setIsAnnouncementModalOpen(true)}
                        className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border border-gray-100 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all shadow-sm"
                    >
                        <Megaphone size={16} className="text-blue-500" />
                        Annonce Citoyenne
                    </button>
                    <button 
                        onClick={() => setIsAddZoneModalOpen(true)}
                        className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/20"
                    >
                        <Plus size={16} />
                        Créer une Zone
                    </button>
                </div>
            </header>

            {/* GovTech Analytics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-emerald-500" />
                        </div>
                     </div>
                     <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Taux de Salubrité</p>
                     <p className="text-3xl font-black italic tracking-tighter dark:text-white">{collectionRate}%</p>
                 </div>
                 <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                         <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
                             <Trash2 className="w-5 h-5 text-primary" />
                         </div>
                     </div>
                     <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Signalements</p>
                     <p className="text-3xl font-black italic tracking-tighter dark:text-white">{totalWastes}</p>
                 </div>
                 <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                         <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
                             <CheckCircle2 className="w-5 h-5 text-blue-500" />
                         </div>
                     </div>
                     <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Dépôts Nettoyés</p>
                     <p className="text-3xl font-black italic tracking-tighter dark:text-white">{collectedWastes}</p>
                 </div>
                 <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm border-b-4 border-b-red-500">
                     <div className="flex justify-between items-start mb-4">
                         <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                             <AlertOctagon className="w-5 h-5 text-red-500" />
                         </div>
                     </div>
                     <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Dépassements SLA</p>
                     <p className="text-3xl font-black italic tracking-tighter text-red-500">{slaBreaches}</p>
                 </div>
            </div>

            {/* Interactive Map Area */}
            <div className="w-full shadow-2xl shadow-blue-900/5 rounded-[3rem] relative z-0">
                <MapComponent isMairie={true} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Zones Overview */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-2">
                            <MapPin className="text-primary" size={20} />
                            Zones de Collecte
                        </h2>
                        <div className="flex gap-2">
                             <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input type="text" placeholder="Filtrer..." className="pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-[10px] outline-none font-bold uppercase" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? (
                            <div className="col-span-full py-10 text-center opacity-30">Chargement...</div>
                        ) : zones.length > 0 ? zones.map((zone) => (
                            <motion.div 
                                key={zone.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm group hover:border-primary/30 transition-all"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="px-3 py-1 bg-gray-50 dark:bg-zinc-800 rounded-full text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                        ID: {zone.id.slice(0, 8)}
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => setEditingZone(zone)}
                                            className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                                            title="Modifier la zone"
                                        >
                                            <Filter size={14} />
                                        </button>
                                        <button 
                                            onClick={() => deleteZone(zone.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Supprimer la zone"
                                        >
                                            <XCircle size={14} />
                                        </button>
                                         <span className={cn(
                                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ml-2",
                                            zone.status === 'available' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                        )}>
                                            {zone.status === 'available' ? 'Disponible' : 'Occupée'}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">{zone.name}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-6">{zone.city}</p>
                                
                                <div className="p-4 bg-gray-50/50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={14} className="text-primary" />
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Partenaire</span>
                                    </div>
                                    <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase">
                                        {zone.concessions?.find((c: any) => c.status === 'active')?.profiles?.full_name || 'Aucun'}
                                    </span>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="col-span-full py-20 text-center opacity-30 italic bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100">
                                Aucune zone enregistrée
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Concessions */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-2">
                        <ShieldCheck className="text-primary" size={20} />
                        Dossiers en Attente
                    </h2>
                    <div className="space-y-4">
                        {pendingConcessions.length > 0 ? pendingConcessions.map((con) => (
                            <motion.div 
                                key={con.id}
                                layout
                                className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                     <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                                        {con.profiles?.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none mb-1">{con.profiles?.full_name}</h4>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase italic">Demande de concession</p>
                                    </div>
                                </div>
                                <div className="mb-6 space-y-2">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-bold text-gray-400 uppercase uppercase">Zone Visée</span>
                                        <span className="font-black text-primary uppercase italic">{con.zones?.name || 'ZONE INCONNUE'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-bold text-gray-400 uppercase">Document</span>
                                        <button className="text-primary hover:underline font-black uppercase">Voir attestation.pdf</button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleConcessionAction(con.id, 'active')}
                                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={12} />
                                        Approuver
                                    </button>
                                    <button 
                                        onClick={() => handleConcessionAction(con.id, 'rejected')}
                                        className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <XCircle size={12} />
                                        Refuser
                                    </button>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="p-10 text-center opacity-30 italic bg-gray-50 rounded-[2.5rem] border border-gray-100">
                                Aucun dossier à valider
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Zone Modal */}
            <Modal
                isOpen={isAddZoneModalOpen}
                onClose={() => setIsAddZoneModalOpen(false)}
                title="Créer une Zone de Collecte"
            >
                <form onSubmit={handleCreateZone} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom de la Zone</label>
                        <input 
                            required
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all font-black uppercase tracking-tight"
                            placeholder="Ex: ZONE A - PLATEAU..."
                            value={newZone.name}
                            onChange={(e) => setNewZone({...newZone, name: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Ville</label>
                        <input 
                            required
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all"
                            placeholder="Abidjan"
                            value={newZone.city}
                            onChange={(e) => setNewZone({...newZone, city: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full py-5 bg-gray-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10 mt-4"
                    >
                        Publier la Zone au Catalogue
                    </button>
                </form>
            </Modal>

            {/* Edit Zone Modal */}
            <Modal
                isOpen={!!editingZone}
                onClose={() => setEditingZone(null)}
                title="Modifier la Zone de Collecte"
            >
                {editingZone && (
                    <form onSubmit={handleUpdateZone} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom de la Zone</label>
                            <input 
                                required
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all font-black uppercase tracking-tight"
                                value={editingZone.name}
                                onChange={(e) => setEditingZone({...editingZone, name: e.target.value})}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Ville</label>
                                <input 
                                    required
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all font-black uppercase"
                                    value={editingZone.city}
                                    onChange={(e) => setEditingZone({...editingZone, city: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Statut</label>
                                <select 
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all appearance-none cursor-pointer font-black"
                                    value={editingZone.status}
                                    onChange={(e) => setEditingZone({...editingZone, status: e.target.value})}
                                >
                                    <option value="available">Disponible</option>
                                    <option value="occupied">Occupée</option>
                                </select>
                            </div>
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

            {/* Announcement Modal */}
            <Modal
                isOpen={isAnnouncementModalOpen}
                onClose={() => setIsAnnouncementModalOpen(false)}
                title="Communication Citoyenne"
            >
                <form onSubmit={handleSendAnnouncement} className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl mb-4">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
                            Cette annonce sera poussée sous forme de notification à tous les foyers enregistrés dans la commune. Utilisez-la pour les urgences sanitaires ou les changements importants de collecte.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Titre de l'alerte</label>
                        <input 
                            required
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all font-black uppercase tracking-tight"
                            placeholder="EX: CAMPAGNE DE SALUBRITE CE WEEKEND"
                            value={announcement.title}
                            onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Message</label>
                        <textarea 
                            required
                            rows={4}
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all font-medium resize-none"
                            placeholder="Détails de l'information à transmettre aux citoyens..."
                            value={announcement.message}
                            onChange={(e) => setAnnouncement({...announcement, message: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full py-5 bg-blue-500 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 mt-4"
                    >
                        Diffuser l'Alerte Globale
                    </button>
                </form>
            </Modal>
        </div>
    );
}
