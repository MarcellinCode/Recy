"use client";

import React, { useState, useEffect } from "react";
import { 
    Truck, 
    Users, 
    BarChart3, 
    MapPin, 
    Gavel, 
    TrendingUp, 
    Plus,
    Wallet,
    MoreVertical,
    Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const MapComponent = dynamic(() => import("@/components/map/MapComponent"), {
    ssr: false,
    loading: () => <div className="w-full h-[40vh] bg-gray-50 dark:bg-zinc-900 rounded-[3rem] animate-pulse border border-gray-100 flex items-center justify-center"><p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Chargement tactique...</p></div>
});

import { getVehicles } from "@/app/actions/fleet";
import { showToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/Modal";
import { submitBid } from "@/app/actions/tenders";
import { topUpWallet } from "@/app/actions/wallet";
import { AddAgentForm } from "@/components/organisation/AddAgentForm";
import { getOrganizationContext } from "@/app/actions/organisation";

const MISSION_STATUS_CONFIG: Record<string, { badge: string; label: string }> = {
    in_progress: { badge: "bg-amber-100 text-amber-600", label: "EN COURS" },
    collected: { badge: "bg-emerald-100 text-emerald-600", label: "TERMINÉ" }
};

function getMissionStatusDetails(status: string) {
    return MISSION_STATUS_CONFIG[status] || { badge: "bg-blue-100 text-blue-600", label: "EN ATTENTE" };
}

export default function OrganizationDashboard() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fleet' | 'concessions' | 'opportunities' | 'marketplace'>('fleet');
    const [agents, setAgents] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [concessions, setConcessions] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [tenders, setTenders] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);

    const [mapViewMode, setMapViewMode] = useState<"radar" | "list">("radar");
    const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
    const [concessionWastes, setConcessionWastes] = useState<any[]>([]);
    const [concessionInfractions, setConcessionInfractions] = useState<any[]>([]);

    useEffect(() => {
        if (!profile?.id) return;
        
        const fetchConcessionAlerts = async () => {
            try {
                // 1. Fetch active zones
                const { data: concessionsData } = await supabase
                    .from('concessions')
                    .select('*, zones(*)')
                    .eq('organization_id', profile.id)
                    .eq('status', 'active');
                
                const activeZones = concessionsData?.map((c: any) => c.zones).filter(Boolean) || [];
                if (activeZones.length === 0) return;

                // Helper to check bounding box
                const isPointInZone = (lat: any, lng: any, zone: any) => {
                    if (!zone.boundaries?.geometry?.coordinates) return true;
                    const nLat = Number(lat);
                    const nLng = Number(lng);
                    if (isNaN(nLat) || isNaN(nLng)) return false;

                    const coords = zone.boundaries.geometry.type === "MultiPolygon"
                        ? zone.boundaries.geometry.coordinates.flatMap((poly: any) => poly[0])
                        : zone.boundaries.geometry.coordinates[0];

                    const lons = coords.map((c: any) => c[0]);
                    const lats = coords.map((c: any) => c[1]);
                    const minLon = Math.min(...lons);
                    const maxLon = Math.max(...lons);
                    const minLat = Math.min(...lats);
                    const maxLat = Math.max(...lats);
                    return nLat >= minLat && nLat <= maxLat && nLng >= minLon && nLng <= maxLon;
                };

                // 2. Fetch wastes
                const { data: wastesData } = await supabase
                    .from('wastes')
                    .select('*, waste_types(*)')
                    .in('status', ['published', 'reserved'])
                    .not('latitude', 'is', null)
                    .not('longitude', 'is', null);

                // 3. Fetch infractions
                const { data: infractionsData } = await supabase
                    .from('environmental_infractions')
                    .select('*')
                    .not('latitude', 'is', null)
                    .not('longitude', 'is', null);

                // Filter wastes
                const filteredWastes = (wastesData || []).filter((w: any) => 
                    activeZones.some((z: any) => isPointInZone(w.latitude, w.longitude, z))
                );

                // Filter infractions
                const filteredInfractions = (infractionsData || []).filter((i: any) => 
                    activeZones.some((z: any) => isPointInZone(i.latitude, i.longitude, z))
                );

                setConcessionWastes(filteredWastes);
                setConcessionInfractions(filteredInfractions);
            } catch (err) {
                console.error("Error fetching concession alerts:", err);
            }
        };

        fetchConcessionAlerts();
    }, [profile?.id]);

    const handleTakeCharge = async (wasteId: string) => {
        if (!profile?.id) return;
        try {
            const { error } = await supabase
                .from('wastes')
                .update({ status: 'reserved', collector_id: profile.id })
                .eq('id', wasteId);
            
            if (error) {
                showToast("Erreur lors de la prise en charge : " + error.message, "error");
            } else {
                showToast("Dépôt pris en charge avec succès !", "success");
                fetchData();
                
                // Refresh local concession alerts
                const { data: concessionsData } = await supabase
                    .from('concessions')
                    .select('*, zones(*)')
                    .eq('organization_id', profile.id)
                    .eq('status', 'active');
                
                const activeZones = concessionsData?.map((c: any) => c.zones).filter(Boolean) || [];
                if (activeZones.length > 0) {
                    const { data: wastesData } = await supabase
                        .from('wastes')
                        .select('*, waste_types(*)')
                        .in('status', ['published', 'reserved'])
                        .not('latitude', 'is', null)
                        .not('longitude', 'is', null);
                    
                    const isPointInZone = (lat: any, lng: any, zone: any) => {
                        if (!zone.boundaries?.geometry?.coordinates) return true;
                        const nLat = Number(lat);
                        const nLng = Number(lng);
                        if (isNaN(nLat) || isNaN(nLng)) return false;
                        const coords = zone.boundaries.geometry.type === "MultiPolygon"
                            ? zone.boundaries.geometry.coordinates.flatMap((poly: any) => poly[0])
                            : zone.boundaries.geometry.coordinates[0];
                        const lons = coords.map((c: any) => c[0]);
                        const lats = coords.map((c: any) => c[1]);
                        return nLat >= Math.min(...lats) && nLat <= Math.max(...lats) && nLng >= Math.min(...lons) && nLng <= Math.max(...lons);
                    };

                    setConcessionWastes((wastesData || []).filter((w: any) => activeZones.some((z: any) => isPointInZone(w.latitude, w.longitude, z))));
                }
            }
        } catch (e: any) {
            showToast("Erreur: " + e.message, "error");
        }
    };
    
    const [isBidModalOpen, setIsBidModalOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [isAddAgentMenuOpen, setIsAddAgentMenuOpen] = useState(false); // NEW
    const [selectedTender, setSelectedTender] = useState<any>(null);
    const [bidAmount, setBidAmount] = useState(0);
    const [topUpAmount, setTopUpAmount] = useState(50000);
    const [activeMissions, setActiveMissions] = useState<any[]>([]); // NEW
    
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const res = await getOrganizationContext();
        
        if (res.success) {
            const profile = res.profile;
            const agents = res.agents || [];
            const concessions = res.concessions || [];

            setProfile(profile);
            setAgents(agents);
            setConcessions(concessions);
            
            // Vehicles
            const vRes = await getVehicles();
            setVehicles(vRes.success ? vRes.vehicles : []);

            // Open Tenders
            const { data: tendersData } = await supabase
                .from('tenders')
                .select('*, zones(name)')
                .eq('status', 'open');
            setTenders(tendersData || []);

            // Subscriptions for organization's zones
            if (concessions.length > 0) {
                const { data: subsData } = await supabase
                    .from('household_subscriptions')
                    .select('*, profiles(*), subscription_plans(*, concessions(*))')
                    .in('subscription_plans.concession_id', concessions.map((c: any) => c.id));
                setSubscriptions(subsData || []);
            }

            // Fetch active missions for these agents
            if (agents.length > 0) {
                const agentIds = agents.map((a: any) => a.id);
                const { data: missionsData } = await supabase
                    .from('wastes')
                    .select('*, profiles!wastes_seller_id_fkey(*)')
                    .in('assigned_agent_id', agentIds)
                    .in('status', ['reserved', 'in_progress', 'collected'])
                    .order('updated_at', { ascending: false });
                setActiveMissions(missionsData || []);
            }
        }
        setLoading(false);
    };

    const handleTopUp = async () => {
        const res = await topUpWallet(topUpAmount);
        if (res.success) {
            showToast(`Wallet rechargé de ${topUpAmount} CFA`, "success");
            setIsWalletModalOpen(false);
            fetchData();
        } else {
            showToast("Erreur lors du rechargement", "error");
        }
    };

    const handleBidSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await submitBid({
            tender_id: selectedTender.id,
            bid_amount: bidAmount,
            proposal_text: "Proposition standard d'organisation",
            trucks_count: 1
        });
        if (res.success) {
            showToast("Proposition soumise avec succès", "success");
            setIsBidModalOpen(false);
            fetchData();
        } else {
            showToast(res.error || "Erreur lors de la soumission", "error");
        }
    };

    if (loading) {
        return (
            <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px]">Initialisation du Mission Control...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 mb-20 min-h-screen">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100 dark:border-zinc-800">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-[2px] bg-primary"></span>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">Workspace Organisation</p>
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black uppercase italic tracking-tighter leading-none dark:text-white">
                        Mission <span className="text-primary tracking-tighter">Control</span>
                    </h1>
                    
                    <nav className="flex gap-2 p-1 bg-gray-100 dark:bg-zinc-800/50 rounded-2xl w-fit mt-8">
                        {[
                            { id: 'fleet', label: 'Ma Flotte', icon: Truck },
                            { id: 'concessions', label: 'Concessions', icon: MapPin },
                            { id: 'opportunities', label: 'Appels d\'Offres', icon: Gavel },
                            { id: 'marketplace', label: 'Rapports & Bourse', icon: BarChart3 },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab.id 
                                        ? "bg-white dark:bg-zinc-900 shadow-sm text-primary" 
                                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                )}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <button 
                    type="button"
                    onClick={() => setIsWalletModalOpen(true)} 
                    className="w-full md:w-auto text-left cursor-pointer bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-zinc-800 shadow-xl group hover:border-primary/50 transition-all flex items-center gap-6"
                >
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Solde de l'Organisation</p>
                        <p className="text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                            {profile?.wallet_balance?.toLocaleString() || 0} <span className="text-sm font-bold opacity-50">CFA</span>
                        </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
                        <Plus size={16} />
                    </div>
                </button>
            </header>

            {profile?.subscription_tier !== 'organisation' && activeTab !== 'opportunities' && (
                <div className="relative">
                    <div className="absolute inset-0 z-50 backdrop-blur-md bg-white/30 dark:bg-zinc-900/30 rounded-[3rem] flex items-center justify-center p-8">
                        <div className="bg-white dark:bg-zinc-900 p-12 rounded-[3.5rem] border border-gray-100 dark:border-zinc-800 shadow-2xl text-center max-w-xl">
                            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-8">
                                <Lock size={40} />
                            </div>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4 dark:text-white">Accès Tactique Verrouillé</h2>
                            <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mb-10 leading-loose">
                                Votre organisation doit souscrire à l'abonnement **"Platform Standard" (20 000 F / mois)** pour activer la gestion de flotte, le suivi des agents et le pilotage des concessions.
                            </p>
                            <button 
                                onClick={() => globalThis.location.href = '/abonnements'}
                                className="px-12 py-5 bg-primary text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                            >
                                Activer les Outils Pro
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AnimatePresence mode="wait">
                {activeTab === 'fleet' && (
                    <motion.div 
                        key="fleet"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-12"
                    >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <MiniStatsCard label="Effectif" value={agents.length.toString()} icon={Users} color="text-blue-500" />
                            <MiniStatsCard label="Unités Mobiles" value={vehicles.length.toString()} icon={Truck} color="text-amber-500" />
                            <MiniStatsCard label="Zones Actives" value={concessions.length.toString()} icon={MapPin} color="text-indigo-500" />
                            <MiniStatsCard label="Abonnés" value={subscriptions.length.toString()} icon={Users} color="text-emerald-500" />
                        </div>

                        <div className="w-full h-[600px] shadow-2xl shadow-emerald-900/5 rounded-[3rem] overflow-hidden border border-gray-100 dark:border-zinc-800 relative flex flex-col">
                            {/* Premium Floating View Mode Switcher */}
                            <div className="absolute top-6 right-6 z-[1000] flex bg-zinc-900/95 border border-emerald-500/20 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl">
                                <button 
                                    onClick={() => setMapViewMode("radar")}
                                    className={cn(
                                        "px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                        mapViewMode === "radar" 
                                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25" 
                                            : "text-zinc-400 hover:text-white"
                                    )}
                                >
                                    🗺️ Radar
                                </button>
                                <button 
                                    onClick={() => setMapViewMode("list")}
                                    className={cn(
                                        "px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                        mapViewMode === "list" 
                                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25" 
                                            : "text-zinc-400 hover:text-white"
                                    )}
                                >
                                    📋 Liste
                                </button>
                            </div>

                            {mapViewMode === "radar" ? (
                                <MapComponent 
                                    isMairie={false} 
                                    targetCity={profile?.city} 
                                    organizationId={profile?.id} 
                                    focusCoords={focusCoords}
                                />
                            ) : (
                                <div className="absolute inset-0 z-10 bg-slate-900 border border-slate-800 rounded-[3rem] p-8 overflow-y-auto no-scrollbar flex flex-col pt-24">
                                    <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                                        <div>
                                            <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">Table Tactique des Concessions</h3>
                                            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Signalements actifs dans vos zones géographiques sous contrat</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            ...concessionWastes.map(w => ({ ...w, itemType: 'waste' })),
                                            ...concessionInfractions.map(i => ({ ...i, itemType: 'infraction' }))
                                        ].sort((a, b) => {
                                            const aAge = Date.now() - new Date(a.created_at).getTime();
                                            const bAge = Date.now() - new Date(b.created_at).getTime();
                                            return bAge - aAge;
                                        }).map((item) => {
                                            const isWaste = item.itemType === 'waste';
                                            const createdAtTime = new Date(item.created_at).getTime();
                                            const elapsedHours = (Date.now() - createdAtTime) / (3600 * 1000);
                                            const slaRemaining = 24 - elapsedHours;
                                            
                                            let slaLabel = "";
                                            let slaColorClass = "";
                                            if (slaRemaining <= 0) {
                                                slaLabel = "🔴 SLA DEPASSE (Point Noir)";
                                                slaColorClass = "text-red-500 bg-red-950/30 border border-red-900/30";
                                            } else if (slaRemaining < 12) {
                                                slaLabel = `🟡 CRITIQUE (Reste ${Math.round(slaRemaining)}h)`;
                                                slaColorClass = "text-amber-500 bg-amber-950/30 border border-amber-900/30";
                                            } else {
                                                slaLabel = `🟢 NOMINAL (Reste ${Math.round(slaRemaining)}h)`;
                                                slaColorClass = "text-emerald-500 bg-emerald-950/30 border border-emerald-900/30";
                                            }

                                            const isAlreadyReserved = item.status === 'reserved' || item.status === 'collected';

                                            return (
                                                <div key={item.id} className="p-5 bg-slate-950 border border-slate-800 rounded-3xl flex items-center justify-between hover:border-emerald-500/30 transition-all gap-4">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner",
                                                            isWaste ? "bg-emerald-950/35 text-emerald-400" : "bg-red-950/35 text-red-400"
                                                        )}>
                                                            {isWaste ? (item.waste_types?.emoji || '🗑️') : '⚠️'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest", slaColorClass)}>
                                                                    {slaLabel}
                                                                </span>
                                                                {!isWaste && (
                                                                    <span className="px-2 py-0.5 bg-red-955/50 text-red-400 border border-red-900/30 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                                        Infraction
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h4 className="text-xs font-black uppercase italic text-white leading-tight truncate">
                                                                {isWaste ? item.waste_types?.name : item.type}
                                                            </h4>
                                                            <p className="text-[10px] text-zinc-400 mt-1 truncate max-w-[280px]">
                                                                {isWaste ? item.location : (item.description || "Pas de description")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button 
                                                            onClick={() => {
                                                                if (item.latitude && item.longitude) {
                                                                    setFocusCoords([Number(item.latitude), Number(item.longitude)]);
                                                                    setMapViewMode("radar");
                                                                } else {
                                                                    showToast("Pas de coordonnées disponibles", "error");
                                                                }
                                                            }}
                                                            className="p-3 bg-zinc-900 text-zinc-400 rounded-xl hover:bg-emerald-955/30 hover:text-emerald-500 transition-colors"
                                                            title="Situer sur la carte"
                                                        >
                                                            🗺️
                                                        </button>
                                                        
                                                        {item.latitude && item.longitude && (
                                                            <a 
                                                                href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-3 bg-zinc-900 text-zinc-400 rounded-xl hover:bg-blue-955/30 hover:text-blue-500 transition-colors"
                                                                title="GPS Navigation"
                                                            >
                                                                📍
                                                            </a>
                                                        )}

                                                        {isWaste && (
                                                            <button 
                                                                onClick={() => handleTakeCharge(item.id)}
                                                                disabled={isAlreadyReserved}
                                                                className={cn(
                                                                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                                    isAlreadyReserved 
                                                                        ? "bg-slate-900 text-zinc-650 cursor-not-allowed border border-slate-800" 
                                                                        : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20"
                                                                )}
                                                            >
                                                                {isAlreadyReserved ? "Pris en charge" : "Collecter"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {concessionWastes.length === 0 && concessionInfractions.length === 0 && (
                                            <div className="py-20 text-center text-zinc-550">
                                                <p className="text-[10px] font-black uppercase tracking-widest">Aucune alerte active dans vos concessions.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Exploitation Terrain</h2>
                                    <button 
                                        onClick={() => setIsAddAgentMenuOpen(true)}
                                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                                    >
                                        + Recruter un agent
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
                                    {agents.length === 0 && (
                                        <div className="col-span-2 py-16 text-center bg-gray-50 dark:bg-zinc-900 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-zinc-800">
                                            <Users size={32} className="mx-auto mb-4 text-zinc-300" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Aucun agent actif</p>
                                        </div>
                                    )}
                                </div>
                                
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter mt-12 mb-6 dark:text-white">Missions en cours (Live)</h2>
                                <div className="space-y-4">
                                    {activeMissions.length === 0 && (
                                        <div className="py-12 text-center border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-[2rem]">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Aucune mission sur le terrain</p>
                                        </div>
                                    )}
                                    {activeMissions.map(mission => {
                                        const statusDetails = getMissionStatusDetails(mission.status);
                                        return (
                                            <div key={mission.id} className="flex items-center justify-between p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <p className="text-sm font-black uppercase italic dark:text-white">{mission.profiles?.full_name || 'Client Inconnu'}</p>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                            statusDetails.badge
                                                        )}>
                                                            {statusDetails.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-400 font-bold uppercase">{mission.mission_type === 'subscription_pickup' ? 'Abonnement' : 'Marketplace'} • Agent: {agents.find(a => a.id === mission.assigned_agent_id)?.full_name || 'Inconnu'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-primary">{mission.final_weight || mission.estimated_weight} KG</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-8">
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Portefeuille Clients</h2>
                                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] p-8 space-y-8 shadow-sm">
                                    <div className="space-y-4">
                                        <PlanSummary name="Foyer (Société)" count={0} price="2,000" color="bg-emerald-500" />
                                        <PlanSummary name="Entreprise" count={0} price="6,000" color="bg-blue-500" />
                                        <PlanSummary name="Industrie" count={0} price="15,000" color="bg-amber-500" />
                                    </div>
                                    <button onClick={() => showToast("Configuration des tarifs de zone en cours de développement", "success")} className="w-full py-4 border-2 border-zinc-900 dark:border-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-900 hover:text-white transition-all">Gérer les Tarifs Zone</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'concessions' && (
                    <motion.div 
                        key="concessions"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {concessions.map((con) => (
                            <div key={con.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-xl">
                                <div className="flex justify-between items-start mb-6">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded-full">Zone active</span>
                                    <MapPin size={16} className="text-zinc-300" />
                                </div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">{con.zones?.name}</h3>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase mb-6">{con.zones?.city}</p>
                                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl space-y-3">
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-zinc-400">Total Abonnés</span>
                                        <span className="text-zinc-900 dark:text-white">42 Ménages</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-zinc-400">Revenus Mensuels</span>
                                        <span className="text-emerald-500">315,000 CFA</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {concessions.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-zinc-800">
                                <MapPin size={32} className="mx-auto mb-4 text-zinc-300" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Aucune concession territoriale active</p>
                                <button onClick={() => setActiveTab('opportunities')} className="mt-4 text-[10px] font-black text-primary underline">Explorer les opportunités</button>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'opportunities' && (
                    <motion.div 
                        key="opportunities"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="bg-primary/5 p-12 rounded-[3.5rem] border border-primary/10 mb-12 relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4 text-primary">Opportunités de Marché</h2>
                                <p className="text-sm font-bold text-primary/70 uppercase max-w-md">Répondez aux appels d'offres des mairies pour obtenir des concessions de collecte exclusives.</p>
                            </div>
                            <Gavel size={200} className="absolute -bottom-10 -right-10 text-primary opacity-[0.03] rotate-12" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {tenders.map((tender) => (
                                <div key={tender.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-xl flex flex-col justify-between hover:border-primary/30 transition-all">
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <span className="px-3 py-1 bg-primary/10 text-primary text-[8px] font-black uppercase rounded-full">Zone {tender.zones?.name}</span>
                                            <span className="text-[10px] font-black italic">Est. {tender.budget_estimate?.toLocaleString()} CFA</span>
                                        </div>
                                        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">{tender.title}</h3>
                                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed mb-8">{tender.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setSelectedTender(tender);
                                            setBidAmount(tender.budget_estimate);
                                            setIsBidModalOpen(true);
                                        }}
                                        className="w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg"
                                    >
                                        Soumettre une Proposition
                                    </button>
                                </div>
                            ))}
                            {tenders.length === 0 && (
                                <div className="col-span-full py-24 text-center">
                                    <p className="text-xl font-black uppercase italic text-zinc-300">Aucun appel d'offres en cours</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'marketplace' && (
                    <motion.div 
                        key="marketplace"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-10"
                    >
                        <div className="bg-white dark:bg-zinc-900 p-12 rounded-[3.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                           <TrendingUp className="absolute -bottom-10 -right-10 w-64 h-64 text-zinc-50 group-hover:text-emerald-500/10 transition-all" />
                           <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">La Bourse</h3>
                           <p className="text-zinc-500 text-xs font-bold uppercase tracking-tight mb-8">Revendez vos stocks de matières premières recyclées aux industries de transformation.</p>
                            <button onClick={() => router.push('/marketplace')} className="px-10 py-5 bg-emerald-500 text-white rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-500/20">Accéder au Marché</button>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-12 rounded-[3.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Rapports ESG</h3>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-tight mb-8">Générez vos manifestes de traçabilité et rapports d'impact environnemental certifiés.</p>
                            <div className="flex gap-4">
                                <button onClick={() => showToast("Génération du rapport de traçabilité...", "success")} className="flex-1 py-5 bg-zinc-100 dark:bg-zinc-800 rounded-[2rem] text-[10px] font-black uppercase tracking-widest">Traçabilité</button>
                                <button onClick={() => globalThis.print()} className="flex-1 py-5 bg-primary text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest">Export PDF</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Modal isOpen={isBidModalOpen} onClose={() => setIsBidModalOpen(false)} title="Soumission au Marché">
                <form onSubmit={handleBidSubmit} className="space-y-8">
                    <div className="p-6 bg-gray-50 dark:bg-zinc-900 rounded-[2.5rem]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Marché Sélectionné</p>
                        <p className="text-lg font-black uppercase italic text-zinc-900 dark:text-white">{selectedTender?.title}</p>
                    </div>
                    <div className="space-y-4">
                        <label htmlFor="bidAmount" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Votre Offre Financière (CFA)</label>
                        <input 
                            id="bidAmount"
                            type="number"
                            required
                            className="w-full px-8 py-6 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-primary rounded-[2rem] text-2xl font-black italic outline-none transition-all"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(Number.parseInt(e.target.value, 10))}
                        />
                        <p className="text-[9px] text-zinc-400 font-bold uppercase italic ml-4">* Une commission de service de 2% sera prélevée en cas d'attribution.</p>
                    </div>
                    <button type="submit" className="w-full py-6 bg-primary text-white rounded-[2.5rem] text-[12px] font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all">Envoyer la Proposition</button>
                </form>
            </Modal>

            <Modal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} title="Simulation de Rechargement Management">
                <div className="space-y-8 py-4">
                    <p className="text-[11px] font-black uppercase text-zinc-400 text-center">Créditez le compte de l'organisation pour tester les flux.</p>
                    <div className="grid grid-cols-2 gap-4">
                         {[50000, 100000, 250000, 500000].map((amount) => (
                             <button 
                                key={amount}
                                onClick={() => setTopUpAmount(amount)}
                                className={cn(
                                    "py-6 rounded-[2rem] text-lg font-black italic transition-all border-2",
                                    topUpAmount === amount ? "bg-primary text-white border-primary" : "bg-gray-50 dark:bg-zinc-800 border-transparent hover:border-zinc-200"
                                )}
                             >
                                 {amount.toLocaleString()} <span className="text-[9px] font-bold opacity-50">CFA</span>
                             </button>
                         ))}
                    </div>
                    <button onClick={handleTopUp} className="w-full py-6 bg-emerald-500 text-white rounded-[2.5rem] text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20">Valider le Rechargement</button>
                </div>
            </Modal>

            <AddAgentForm 
                isOpen={isAddAgentMenuOpen}
                onClose={() => setIsAddAgentMenuOpen(false)}
                onSuccess={fetchData}
                concessions={concessions}
                vehicles={vehicles}
            />
        </div>
    );
}

function MiniStatsCard({ label, value, icon: Icon, color }: any) {
    return (
        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm space-y-3">
            <div className={cn("w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center", color)}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
                <p className="text-2xl font-black italic tracking-tighter dark:text-white">{value}</p>
            </div>
        </div>
    );
}

function AgentCard({ agent }: any) {
    return (
        <div className="p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] shadow-sm hover:border-primary/30 transition-all group">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                        {agent.full_name?.charAt(0)}
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-tight">{agent.full_name}</h4>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-black uppercase px-2 py-0.5 rounded-lg tracking-widest">En Service</span>
                    </div>
                </div>
                <button onClick={() => showToast("Options de l'agent", "success")} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><MoreVertical className="w-5 h-5 text-zinc-400" /></button>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl mb-6">
                 <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Dernière Action</p>
                 <p className="text-xs font-black dark:text-white italic">Collecte validée à Yopougon</p>
            </div>

            <button onClick={() => showToast("Chargement de l'historique des missions...", "success")} className="w-full py-4 bg-primary text-[10px] font-black uppercase tracking-widest text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                Détails Missions
            </button>
        </div>
    );
}

function PlanSummary({ name, count, price, color }: any) {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl">
            <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full", color)} />
                <p className="text-xs font-black uppercase text-gray-700 dark:text-zinc-300">{name}</p>
            </div>
            <div className="text-right">
                <p className="text-xs font-black dark:text-white italic">{count} <span className="text-[9px] text-zinc-400">adhérents</span></p>
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{price} CFA</p>
            </div>
        </div>
    );
}
