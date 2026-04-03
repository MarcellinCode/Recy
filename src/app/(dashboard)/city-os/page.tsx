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
    Megaphone,
    Gavel,
    ShieldAlert,
    BarChart3,
    FileDown,
    Truck,
    Lock
} from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/Modal";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { createTender, awardTender } from "@/app/actions/tenders";

const MapComponent = dynamic(() => import("@/components/map/MapComponent"), {
    ssr: false,
    loading: () => <div className="w-full h-[60vh] bg-gray-50 dark:bg-zinc-900 rounded-[3rem] animate-pulse border border-gray-100 flex items-center justify-center"><p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Chargement de la carte...</p></div>
});

function MairieDashboardContent() {
    const searchParams = useSearchParams();
    const targetMairieId = searchParams.get('id');
    
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'tenders' | 'sovereignty' | 'fleet'>('overview');
    const [zones, setZones] = useState<any[]>([]);
    const [pendingConcessions, setPendingConcessions] = useState<any[]>([]);
    const [wastes, setWastes] = useState<any[]>([]);
    const [tenders, setTenders] = useState<any[]>([]);
    const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
    const [isAddTenderModalOpen, setIsAddTenderModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<any | null>(null);
    const [newZone, setNewZone] = useState({ name: "", city: "Abidjan", status: "available" });
    const [newTender, setNewTender] = useState({ zone_id: "", title: "", description: "", end_date: "", budget_estimate: 0 });
    const [announcement, setAnnouncement] = useState({ title: "", message: "", type: "info" });
    const [profile, setProfile] = useState<any>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchMairieData();
    }, [targetMairieId]);


    async function fetchMairieData() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            // Déterminer l'ID de la mairie à afficher
            // Si on est Super Admin et qu'un ID est passé, on l'utilise
            let mairieId = user.id;
            
            const { data: currentUserProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (currentUserProfile?.role === 'super_admin' && targetMairieId) {
                mairieId = targetMairieId;
            }

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', mairieId)
                .single();
            setProfile(profileData);

            // 1. Récupérer les Zones (Idéalement filtrées par mairie_id si existant, sinon globales)
            const { data: zonesData } = await supabase.from('zones').select('*');
            
            // 2. Récupérer les Concessions associées (et profils)
            const { data: concessionsData } = await supabase
                .from('concessions')
                .select('*');
            
            const profileIds = [...new Set([
                ...(concessionsData?.map((c: any) => c.organization_id) || []),
                ...(concessionsData?.map((c: any) => c.profiles?.id) || [])
            ].filter(Boolean))];

            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .in('id', profileIds);

            // 3. Fusionner les données pour les zones
            const enrichedZones = zonesData?.map((zone: any) => ({
                ...zone,
                concessions: concessionsData?.filter((c: any) => c.zone_id === zone.id).map((c: any) => ({
                    ...c,
                    profiles: profilesData?.find((p: any) => p.id === c.organization_id)
                }))
            })) || [];

            const { data: wastesData } = await supabase
                .from('wastes')
                .select('id, status, created_at, estimated_weight');

            const { data: tendersData } = await supabase
                .from('tenders')
                .select('*')
                .eq('mairie_id', mairieId);
            
            const { data: bidsData } = await supabase
                .from('tender_bids')
                .select('*');

            const enrichedTenders = tendersData?.map((t: any) => ({
                ...t,
                tender_bids: bidsData?.filter((b: any) => b.tender_id === t.id).map((b: any) => ({
                    ...b,
                    profiles: profilesData?.find((p: any) => p.id === b.organization_id)
                }))
            })) || [];

            setZones(enrichedZones);
            setPendingConcessions(concessionsData?.filter((c: any) => c.status === 'pending').map((c: any) => ({
                ...c,
                profiles: profilesData?.find((p: any) => p.id === c.organization_id),
                zones: zonesData?.find((z: any) => z.id === c.zone_id)
            })) || []);
            setWastes(wastesData || []);
            setTenders(enrichedTenders);
        } catch (err: any) {
            console.error("fetchMairieData error:", err?.message);
        }
        setLoading(false);
    }

    const handleCreateTender = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await createTender(newTender);
        if (res.success) {
            showToast("Appel d'offres publié", "success");
            setIsAddTenderModalOpen(false);
            fetchMairieData();
        } else {
            showToast(res.error || "Erreur", "error");
        }
    };

    const handleAwardTender = async (tenderId: string, bidId: string, organizationId: string, zoneId: string) => {
        const res = await awardTender(tenderId, bidId, organizationId, zoneId);
        if (res.success) {
            showToast("Marché attribué avec succès", "success");
            fetchMairieData();
        } else {
            showToast("Erreur lors de l'attribution", "error");
        }
    };

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

    // Statistiques GovTech
    const totalWastes = wastes.length;
    const collectedWastes = wastes.filter(w => w.status === 'collected').length;
    const collectionRate = totalWastes > 0 ? Math.round((collectedWastes / totalWastes) * 100) : 0;
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
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-6">Plateforme de Souveraineté Urbaine & Pilotage Territorial</p>
                    
                    {/* Navigation Tabs */}
                    <nav className="flex gap-2 p-1 bg-gray-100 dark:bg-zinc-800/50 rounded-2xl w-fit">
                        {[
                            { id: 'overview', label: 'Vue d\'ensemble', icon: Activity },
                            { id: 'tenders', label: 'Appels d\'Offres', icon: Gavel },
                            { id: 'fleet', label: 'Gestion Flotte', icon: Truck },
                            { id: 'sovereignty', label: 'Souveraineté', icon: ShieldAlert },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                                    activeTab === tab.id 
                                        ? "bg-white dark:bg-zinc-900 text-primary shadow-sm" 
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <tab.icon size={12} />
                                {tab.label}
                                {tab.id === 'fleet' && profile?.subscription_tier !== 'mairie' && <Lock size={8} className="text-primary ml-1" />}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="flex gap-4">
                    {activeTab === 'tenders' ? (
                        <button 
                            onClick={() => setIsAddTenderModalOpen(true)}
                            className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/20"
                        >
                            <Plus size={16} />
                            Lancer une Mise en Concurrence
                        </button>
                    ) : activeTab === 'overview' ? (
                         <button 
                            onClick={() => setIsAddZoneModalOpen(true)}
                            className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/20"
                        >
                            <Plus size={16} />
                            Nouvelle Zone
                        </button>
                    ) : (
                        <button 
                            onClick={() => setIsAnnouncementModalOpen(true)}
                            className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border border-gray-100 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all shadow-sm"
                        >
                            <Megaphone size={16} className="text-blue-500" />
                            Alerte Citoyenne
                        </button>
                    )}
                </div>
            </header>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div 
                        key="overview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-12"
                    >
                        {/* GovTech Analytics Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Salubrité Commune</p>
                                <p className="text-3xl font-black italic tracking-tighter dark:text-white">{collectionRate}%</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Signalements Totaux</p>
                                <p className="text-3xl font-black italic tracking-tighter dark:text-white">{totalWastes}</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm border-r-4 border-r-amber-500">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Zones en Concession</p>
                                <p className="text-3xl font-black italic tracking-tighter dark:text-white">{zones.filter(z => z.status === 'occupied').length}</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm border-b-4 border-b-red-500 text-red-500">
                                <p className="text-[9px] font-black uppercase tracking-widest text-red-300 mb-2">Dépassements SLA (48h)</p>
                                <p className="text-3xl font-black italic tracking-tighter">{slaBreaches}</p>
                            </div>
                        </div>

                        <div className="w-full shadow-2xl shadow-blue-900/5 rounded-[3rem] overflow-hidden">
                            <MapComponent isMairie={true} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-zinc-900 dark:text-white">
                            <div className="lg:col-span-2 space-y-6">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">Zones du Territoire</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {zones.map((zone) => (
                                        <div key={zone.id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 group hover:border-primary/50 transition-all">
                                            <h3 className="font-black italic uppercase text-lg">{zone.name}</h3>
                                            <p className="text-[10px] text-zinc-400 uppercase font-bold mb-4">{zone.city}</p>
                                            <div className="flex justify-between items-center text-[10px] font-black">
                                                <span className="text-zinc-400">PARTENAIRE :</span>
                                                <span className="text-primary italic">{zone.concessions?.[0]?.profiles?.full_name || "MUNICIPAL"}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">Approvals</h2>
                                <div className="space-y-4">
                                    {pendingConcessions.map((con) => (
                                        <div key={con.id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800">
                                            <p className="text-[10px] font-black text-gray-500 uppercase mb-2">{con.profiles?.full_name}</p>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase mb-4">ZONE: {con.zones?.name}</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleConcessionAction(con.id, 'active')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase">Accepter</button>
                                                <button onClick={() => handleConcessionAction(con.id, 'rejected')} className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase">Refuser</button>
                                            </div>
                                        </div>
                                    ))}
                                    {pendingConcessions.length === 0 && <p className="text-[10px] text-zinc-400 uppercase font-black text-center py-10">Aucun dossier en attente</p>}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'tenders' && (
                    <motion.div 
                        key="tenders"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tenders.map((tender) => (
                                <div key={tender.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-xl overflow-hidden relative">
                                    <div className="flex justify-between items-start mb-6">
                                        <span className={cn(
                                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            tender.status === 'open' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-gray-50 text-gray-400 border border-gray-100"
                                        )}>
                                            {tender.status}
                                        </span>
                                        <span className="text-[10px] font-black text-primary">Budget: {tender.budget_estimate?.toLocaleString()} CFA</span>
                                    </div>
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">{tender.title}</h3>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase mb-8 line-clamp-2">{tender.description}</p>
                                    
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 italic">Soumissions ({tender.tender_bids?.length || 0})</h4>
                                            <BarChart3 size={16} className="text-primary" />
                                        </div>
                                        <div className="space-y-3">
                                            {tender.tender_bids?.map((bid: any) => (
                                                <div key={bid.id} className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between group transition-all hover:bg-white dark:hover:bg-zinc-800">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-zinc-900 dark:text-white leading-none mb-1">{bid.profiles?.full_name}</p>
                                                        <p className="text-[10px] font-bold text-emerald-500 uppercase">{bid.bid_amount.toLocaleString()} CFA</p>
                                                    </div>
                                                    {tender.status === 'open' ? (
                                                        <button 
                                                            onClick={() => handleAwardTender(tender.id, bid.id, bid.organisation_id, tender.zone_id)}
                                                            className="px-4 py-2 bg-primary text-white rounded-xl text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all font-black shadow-lg shadow-primary/20"
                                                        >
                                                            Attribuer
                                                        </button>
                                                    ) : bid.status === 'accepted' && (
                                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                                    )}
                                                </div>
                                            ))}
                                            {tender.tender_bids?.length === 0 && <p className="text-[10px] text-zinc-400 uppercase font-black text-center py-4 italic">En attente de soumissions...</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'sovereignty' && (
                    <motion.div 
                        key="sovereignty"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-10"
                    >
                        <div className="bg-gradient-to-br from-zinc-900 to-black p-12 rounded-[3.5rem] text-white border border-white/5 relative overflow-hidden group shadow-2xl">
                           <ShieldAlert className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 group-hover:text-primary/10 transition-all duration-700" />
                           <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Police Verte</h3>
                           <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-8 max-w-md uppercase tracking-tight">Module de souveraineté territoriale : Verbalisation directe des pollueurs et contrôle des dépôts sauvages.</p>
                           <button className="px-10 py-5 bg-white text-black rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl">Accéder au Centre de Sanction</button>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-12 rounded-[3.5rem] border border-gray-100 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
                            <div>
                                <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4 text-zinc-900 dark:text-white">Régie Financière</h3>
                                <p className="text-zinc-400 text-sm font-bold leading-relaxed mb-8 uppercase tracking-tight">Collecte automatisée des taxes de salubrité urbaine et gestion des revenus municipaux.</p>
                            </div>
                            <div className="flex gap-4">
                                <button className="flex-1 px-8 py-5 border-2 border-zinc-900 dark:border-white text-zinc-900 dark:text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all">Audit Fiscal</button>
                                <button className="flex-1 px-8 py-5 bg-zinc-900 dark:bg-white dark:text-black text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                    <FileDown size={14} />
                                    Export Rapport
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'fleet' && (
                    <motion.div 
                        key="fleet"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-12"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="bg-white dark:bg-zinc-900 p-12 rounded-[3.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                                <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4 text-zinc-900 dark:text-white">Carnet d'Entretien</h3>
                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-tight mb-8">Suivi rigoureux de la maintenance curative et préventive de la flotte municipale.</p>
                                <div className="space-y-3">
                                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span>Camion-Benn #04</span>
                                        <span className="text-amber-500">Vidange requise</span>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span>Compacteur #01</span>
                                        <span className="text-emerald-500">Opérationnel</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-primary to-primary-focus p-12 rounded-[3.5rem] text-white shadow-2xl flex flex-col justify-between">
                                <div>
                                    <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Gestion de Parc</h3>
                                    <p className="opacity-70 text-xs font-bold uppercase tracking-tight mb-8 leading-loose">Optimisez l'allocation de vos Ressources Mobiles et la rotation des agents de voirie.</p>
                                </div>
                                <button className="w-full py-5 bg-white text-primary rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl">Ajouter un Véhicule</button>
                            </div>
                        </div>

                        {profile?.subscription_tier !== 'mairie' && (
                            <div className="p-20 text-center bg-gray-50 dark:bg-zinc-900/50 rounded-[4rem] border-4 border-dashed border-gray-100 dark:border-zinc-800">
                                <Lock size={48} className="mx-auto mb-6 text-primary" />
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-zinc-900 dark:text-zinc-100">Pack Elite Requis</h3>
                                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] max-w-sm mx-auto mb-10 leading-loose">
                                    Activez l'abonnement **"Mairie Elite" (200 000 F / mois)** pour accéder aux outils de gestion de flotte et souveraineté territoriale.
                                </p>
                                <button
                                    onClick={() => window.location.href = '/abonnements'}
                                    className="px-10 py-5 bg-primary text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest"
                                >
                                    Souscrire au Pack Elite
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <Modal isOpen={isAddTenderModalOpen} onClose={() => setIsAddTenderModalOpen(false)} title="Lancer une Mise en Concurrence">
                <form onSubmit={handleCreateTender} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Zone Stratégique</label>
                        <select 
                            required
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none font-black uppercase"
                            value={newTender.zone_id}
                            onChange={(e) => setNewTender({...newTender, zone_id: e.target.value})}
                        >
                            <option value="">Sélectionner une zone...</option>
                            {zones.filter(z => z.status === 'available').map(z => (
                                <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Titre du Marché</label>
                        <input 
                            required
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none font-black uppercase"
                            placeholder="Ex: Collecte Déchets Plastiques 2024"
                            value={newTender.title}
                            onChange={(e) => setNewTender({...newTender, title: e.target.value})}
                        />
                    </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Description des besoins</label>
                        <textarea 
                            required
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none font-medium min-h-[100px]"
                            placeholder="Détails techniques, fréquences de passage..."
                            value={newTender.description}
                            onChange={(e) => setNewTender({...newTender, description: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Budget Approuvé</label>
                            <input 
                                type="number"
                                required
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none font-black uppercase"
                                placeholder="CFA"
                                value={newTender.budget_estimate}
                                onChange={(e) => setNewTender({...newTender, budget_estimate: parseInt(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Clôture des offres</label>
                            <input 
                                type="date"
                                required
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none font-black uppercase"
                                value={newTender.end_date}
                                onChange={(e) => setNewTender({...newTender, end_date: e.target.value})}
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-5 bg-primary text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20">Diffuser l'Appel d'Offres</button>
                </form>
            </Modal>

            <Modal isOpen={isAddZoneModalOpen} onClose={() => setIsAddZoneModalOpen(false)} title="Définir une Zone de Collecte">
                 <form onSubmit={async (e) => {
                     e.preventDefault();
                     const { error } = await supabase.from('zones').insert([newZone]);
                     if (error) showToast("Erreur", "error");
                     else { showToast("Zone créée", "success"); fetchMairieData(); setIsAddZoneModalOpen(false); }
                 }} className="space-y-6">
                    <input 
                        required
                        className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none font-black uppercase"
                        placeholder="Nom de la zone"
                        value={newZone.name}
                        onChange={(e) => setNewZone({...newZone, name: e.target.value})}
                    />
                    <input 
                        required
                        className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none font-black uppercase"
                        placeholder="Ville"
                        value={newZone.city}
                        onChange={(e) => setNewZone({...newZone, city: e.target.value})}
                    />
                    <button type="submit" className="w-full py-5 bg-black text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest">Enregistrer la Zone</button>
                 </form>
            </Modal>
        </div>
    );
}

export default function MairieManagementPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Activity className="w-12 h-12 text-primary animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Initialisation du City OS...</p>
            </div>
        }>
            <MairieDashboardContent />
        </Suspense>
    );
}
