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
    Lock,
    Leaf,
    Globe,
    TrendingUp,
    DollarSign,
    Eye,
    FileText,
    Calendar,
    Printer,
    AlertTriangle,
    Zap,
    Star,
    Handshake
} from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/Modal";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { createTender, awardTender } from "@/app/actions/tenders";
import { 
    assignConcessionDirectly, 
    getOrganizationsForConcession, 
    revokeConcession, 
    checkAndCleanupExpiredConcessions 
} from "@/app/actions/concessions";
import { 
    NeonCard, 
    HoloGauge, 
    LiveTicker, 
    StatusIndicator 
} from "@/components/dashboard/CockpitComponents";
import { 
    VehicleCard, 
    MaintenanceIntel, 
    TelemetryFeed, 
    RouteOptimizationOverlay 
} from "@/components/dashboard/LogisticsComponents";

const MapComponent = dynamic(() => import("@/components/map/MapComponent"), {
    ssr: false,
    loading: () => <div className="w-full h-[60vh] bg-gray-50 dark:bg-zinc-900 rounded-[3rem] animate-pulse border border-gray-100 flex items-center justify-center"><p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Chargement de la carte...</p></div>
});

function MairieDashboardContent() {
    const searchParams = useSearchParams();
    const targetMairieId = searchParams.get('id');
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'tenders' | 'sovereignty' | 'fleet' | 'rapports'>('overview');
    const [zones, setZones] = useState<any[]>([]);
    const [pendingConcessions, setPendingConcessions] = useState<any[]>([]);
    const [wastes, setWastes] = useState<any[]>([]);
    const [tenders, setTenders] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [fleetPositions, setFleetPositions] = useState<any[]>([]);
    const [isIAOptimizing, setIsIAOptimizing] = useState(false);
    
    const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
    const [isAddTenderModalOpen, setIsAddTenderModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [isSanctionModalOpen, setIsSanctionModalOpen] = useState(false);
    
    const [newZone, setNewZone] = useState({ name: "", city: "Abidjan", status: "available", description: "" });
    const [isAttributingDirectly, setIsAttributingDirectly] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [concessionDuration, setConcessionDuration] = useState(12);
    
    const [newTender, setNewTender] = useState({ zone_id: "", title: "", description: "", end_date: "", budget_estimate: 0 });
    const [liveEvents, setLiveEvents] = useState<any[]>([
        { id: 1, type: "INITIALISATION", message: "Chargement du système territorial...", timestamp: new Date() },
        { id: 2, type: "RADAR", message: "Scan des points noirs activé.", timestamp: new Date() }
    ]);
    const supabase = createClient();

    useEffect(() => {
        const initDashboard = async () => {
            await checkAndCleanupExpiredConcessions();
            fetchMairieData();
        };
        initDashboard();
    }, [targetMairieId]);


    async function fetchMairieData() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let mairieId = user.id;
            const { data: currentUserProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (currentUserProfile?.role === 'super_admin' && targetMairieId) mairieId = targetMairieId;

            const { data: zonesData } = await supabase.from('zones').select('*');
            const { data: concessionsData } = await supabase.from('concessions').select('*');
            
            const profileIds = [...new Set([
                ...(concessionsData?.map((c: any) => c.organization_id) || []),
                ...(concessionsData?.map((c: any) => c.profiles?.id) || [])
            ].filter(Boolean))];

            const { data: profilesData } = await supabase.from('profiles').select('id, full_name, role').in('id', profileIds);

            const enrichedZones = zonesData?.map((zone: any) => ({
                ...zone,
                concessions: concessionsData?.filter((c: any) => c.zone_id === zone.id).map((c: any) => ({
                    ...c,
                    profiles: profilesData?.find((p: any) => p.id === c.organization_id)
                }))
            })) || [];

            const { data: wastesData } = await supabase.from('wastes').select('id, status, created_at, estimated_weight');
            const { data: tendersData } = await supabase.from('tenders').select('*').eq('mairie_id', mairieId);
            const { data: bidsData } = await supabase.from('tender_bids').select('*');
            const { data: txData } = await supabase.from('transactions').select('*').eq('profile_id', mairieId).order('created_at', { ascending: false });

            const enrichedTenders = tendersData?.map((t: any) => ({
                ...t,
                tender_bids: bidsData?.filter((b: any) => b.tender_id === t.id).map((b: any) => ({
                    ...b,
                    profiles: profilesData?.find((p: any) => p.id === b.organization_id)
                }))
            })) || [];

            setZones(enrichedZones);
            setWastes(wastesData || []);
            setTenders(enrichedTenders);
            setTransactions(txData || []);

            const orgsResult = await getOrganizationsForConcession();
            if (orgsResult.success) setOrganizations(orgsResult.organizations || []);

            const { data: vehiclesData } = await supabase.from('vehicles').select('*');
            const { data: posData } = await supabase.from('agent_live_positions').select('*');
            
            setVehicles(vehiclesData || []);
            setFleetPositions(posData || []);

            setLiveEvents(prev => [{ id: Date.now(), type: "SYSTÈME", message: "Souveraineté territoriale confirmée.", timestamp: new Date() }, ...prev.slice(0, 5)]);
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
        } else showToast(res.error || "Erreur", "error");
    };

    const handleAwardTender = async (tenderId: string, bidId: string, organizationId: string, zoneId: string) => {
        const res = await awardTender(tenderId, bidId, organizationId, zoneId);
        if (res.success) {
            showToast("Marché attribué avec succès", "success");
            fetchMairieData();
        } else showToast("Erreur lors de l'attribution", "error");
    };

    const totalWastes = wastes.length;
    const collectedWastes = wastes.filter(w => w.status === 'collected').length;
    const collectionRate = totalWastes > 0 ? Math.round((collectedWastes / totalWastes) * 100) : 0;
    const now = new Date().getTime();
    const slaBreaches = wastes.filter(w => w.status === 'published' && (now - new Date(w.created_at).getTime() > 48 * 3600 * 1000)).length;

    return (
        <div className="flex h-screen w-full bg-slate-50 text-zinc-900 overflow-hidden select-none">
            {/* Sidebar : Live Intel Feed */}
            <aside className="w-[320px] hidden lg:flex flex-col border-r border-zinc-200 bg-white/40 backdrop-blur-3xl p-6">
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center">
                            <ShieldCheck className="text-emerald-500" size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-black italic tracking-tighter uppercase leading-none text-zinc-900 text-shadow-glow-emerald">City OS</h1>
                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">Souveraineté Numérique</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <LiveTicker events={liveEvents} />
                </div>

                <div className="pt-6 border-t border-zinc-100 space-y-4">
                    <StatusIndicator label="Système Radar" status="active" />
                    <StatusIndicator label="Collecte Live" status="active" />
                    <StatusIndicator label="Signalements" status={slaBreaches > 0 ? "warning" : "active"} />
                </div>
            </aside>

            {/* Main Cockpit Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/[0.03] blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/[0.03] blur-[100px] rounded-full pointer-events-none" />

                <header className="p-8 flex items-center justify-between z-50">
                    <nav className="flex gap-2 p-1.5 bg-white/70 backdrop-blur-xl border border-zinc-200 rounded-2xl shadow-sm">
                        {[
                            { id: 'overview', label: 'RADAR CENTRAL', icon: Activity },
                            { id: 'tenders', label: 'APPELS D\'OFFRES', icon: Gavel },
                            { id: 'sovereignty', label: 'SOUVERAINETÉ', icon: ShieldAlert },
                            { id: 'fleet', label: 'LOGISTIQUE', icon: Truck },
                            { id: 'rapports', label: 'ANALYSE', icon: FileText },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 transition-all",
                                    activeTab === tab.id 
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105" 
                                        : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
                                )}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    <button 
                        onClick={() => {
                            if (activeTab === 'fleet') setIsIAOptimizing(!isIAOptimizing);
                            else setIsAddZoneModalOpen(true);
                        }}
                        className={cn(
                            "px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl",
                            activeTab === 'fleet' 
                                ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                                : "bg-zinc-900 text-white shadow-zinc-900/10"
                        )}
                    >
                        {activeTab === 'fleet' ? (isIAOptimizing ? "DÉSACTIVER OPTIMISATION" : "LANCER OPTIMISATION IA") : "DÉPLOYER NOUVELLE ZONE"}
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar p-8 pt-0">
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 relative h-[550px] rounded-[3.5rem] overflow-hidden border border-zinc-200 bg-white shadow-2xl shadow-zinc-200/50 group">
                                        <div className="absolute inset-0 z-0"><MapComponent isMairie={true} /></div>
                                        <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0.2)_100%)]" />
                                    </div>
                                    <div className="space-y-8 overflow-y-auto pr-2 no-scrollbar">
                                        <div className="flex justify-center bg-white/70 backdrop-blur-xl border border-zinc-100 rounded-[3rem] py-8 shadow-xl shadow-zinc-200/10">
                                            <HoloGauge value={collectionRate} label="SALUBRITÉ COMMUNE" />
                                        </div>
                                        <NeonCard title="SIGNALEMENTS ACTIFS" value={totalWastes} icon={AlertTriangle} color="blue" trend="+12 AUJOURD'HUI" />
                                        <NeonCard title="ZONES CONCÉDÉES" value={zones.filter(z => z.status === 'occupied').length} icon={Globe} color="amber" />
                                        <NeonCard title="DÉPASSEMENTS SLA" value={slaBreaches} icon={ShieldAlert} color="red" trend={slaBreaches > 0 ? "CRITIQUE" : "NOMINAL"} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] border border-zinc-100 p-8 shadow-xl shadow-zinc-200/20 relative overflow-hidden group">
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter mb-8 text-zinc-900">SOUVERAINETÉ & CONCESSIONS</h2>
                                        <div className="space-y-4 relative z-10">
                                            {zones.filter(z => z.status === 'occupied').map((zone) => {
                                                const concession = zone.concessions?.[0];
                                                return (
                                                    <div key={zone.id} className="flex items-center justify-between p-5 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] hover:border-emerald-500/30 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-emerald-500 shadow-sm"><Building2 size={24} /></div>
                                                            <div>
                                                                <p className="font-black italic uppercase text-lg text-zinc-900 leading-none mb-1">{concession?.profiles?.full_name || "MUNICIPAL"}</p>
                                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{zone.name}</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={async () => { if (confirm(`Révoquer la concession ?`)) { const res = await revokeConcession(concession.id, zone.id); if (res.success) fetchMairieData(); }}} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><XCircle size={18} /></button>
                                                    </div>
                                                );
                                            })}
                                            {zones.filter(z => z.status === 'occupied').length === 0 && (
                                                <div className="py-20 text-center">
                                                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Aucune concession active.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-zinc-900 rounded-[3rem] p-8 flex flex-col justify-between overflow-hidden shadow-2xl shadow-zinc-900/30 relative">
                                        <TrendingUp className="absolute -right-4 -top-4 text-white/5 w-48 h-48" />
                                        <div className="relative z-10">
                                            <h3 className="text-3xl font-black italic tracking-tighter text-white mb-2 leading-none">AUDIT <br /> TERRITORIAL</h3>
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Flux financiers et taxes temps réel.</p>
                                        </div>
                                        <button onClick={() => setIsAuditModalOpen(true)} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest relative z-10 hover:scale-[1.02] transition-transform shadow-xl shadow-emerald-500/20">Démarrer l'Audit</button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'tenders' && (
                            <motion.div key="tenders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {tenders.map((tender) => (
                                        <div key={tender.id} className="bg-white border border-zinc-100 p-8 rounded-[3.5rem] shadow-xl shadow-zinc-200/20 group hover:border-emerald-500/30 transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Gavel size={64} /></div>
                                            <h3 className="text-2xl font-black italic uppercase text-zinc-900 mb-2 leading-none">{tender.title}</h3>
                                            <p className="text-zinc-500 text-[10px] font-bold mb-10 line-clamp-3 uppercase tracking-wider">{tender.description}</p>
                                            
                                            <div className="space-y-4">
                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Offres Reçues ({tender.tender_bids?.length || 0})</p>
                                                {tender.tender_bids?.map((bid: any) => (
                                                    <div key={bid.id} className="p-5 bg-zinc-50 rounded-2xl flex items-center justify-between border border-zinc-100 hover:border-emerald-500/30 transition-all">
                                                        <div>
                                                            <p className="text-[10px] font-black text-zinc-900 italic uppercase">{bid.profiles?.full_name}</p>
                                                            <p className="text-[8px] font-bold text-emerald-500">SCORE: {bid.profiles?.performanceScore || '4.8'}/5</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleAwardTender(tender.id, bid.id, bid.organization_id, tender.zone_id)} 
                                                            className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-[8px] font-black uppercase hover:shadow-lg transition-all"
                                                        >
                                                            Attribuer
                                                        </button>
                                                    </div>
                                                ))}
                                                {(!tender.tender_bids || tender.tender_bids.length === 0) && (
                                                    <div className="py-10 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                                                        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">En attente d'offres...</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setIsAddTenderModalOpen(true)} 
                                        className="aspect-square bg-white border-2 border-dashed border-zinc-200 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 hover:border-emerald-500/50 hover:bg-emerald-50/20 transition-all group shadow-xl shadow-zinc-200/20"
                                    >
                                        <div className="w-20 h-20 rounded-[2rem] bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 transition-all shadow-inner"><Plus size={40} /></div>
                                        <div>
                                            <p className="text-[12px] font-black text-zinc-900 uppercase tracking-widest text-center">Nouveau Marché</p>
                                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1">Appel d'offres public</p>
                                        </div>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'sovereignty' && (
                            <motion.div key="sovereignty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="bg-white border border-zinc-100 p-12 rounded-[4rem] shadow-2xl shadow-zinc-200/20 flex flex-col justify-between group overflow-hidden relative min-h-[400px]">
                                    <AlertOctagon className="absolute -right-12 -top-12 text-red-500/5 w-64 h-64 rotate-12 transition-transform group-hover:scale-110" />
                                    <div className="relative z-10">
                                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-8 shadow-sm"><ShieldAlert size={32} /></div>
                                        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-900 leading-none mb-4">Unités de <br />Sanction</h2>
                                        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">Gestion stricte des litiges, retards de collecte et pénalités contractuelles.</p>
                                    </div>
                                    <button onClick={() => setIsSanctionModalOpen(true)} className="w-full py-7 bg-red-600 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-red-600/30 hover:scale-[1.01] transition-transform relative z-10">ACCÉDER AU REGISTRE DES CONFLITS</button>
                                </div>
                                <div className="bg-white border border-zinc-100 p-12 rounded-[4rem] shadow-2xl shadow-zinc-200/20 flex flex-col justify-between group overflow-hidden relative min-h-[400px]">
                                    <DollarSign className="absolute -right-12 -top-12 text-emerald-500/5 w-64 h-64 -rotate-12 transition-transform group-hover:scale-110" />
                                    <div className="relative z-10">
                                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-8 shadow-sm"><Activity size={32} /></div>
                                        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-900 leading-none mb-4">Régie <br />Financière</h2>
                                        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">Surveillance temps réel des flux fiscaux et des redevances territoriales.</p>
                                    </div>
                                    <button onClick={() => setIsAuditModalOpen(true)} className="w-full py-7 bg-zinc-900 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-zinc-900/30 hover:scale-[1.01] transition-transform relative z-10">LANCER L'AUDIT FISCAL COMPLET</button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'fleet' && (
                            <motion.div key="fleet" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                    <div className="lg:col-span-3 relative h-[600px] rounded-[4rem] overflow-hidden border border-zinc-200 bg-white shadow-2xl shadow-zinc-200/20">
                                        <div className="absolute inset-0 z-0"><MapComponent isMairie={true} /></div>
                                        {isIAOptimizing && <RouteOptimizationOverlay />}
                                        <div className="absolute top-8 left-8 z-20 flex gap-4">
                                            <div className="px-6 py-3 bg-white/90 backdrop-blur-md rounded-2xl border border-zinc-100 shadow-xl flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">{vehicles.length} UNITÉS ACTIVES</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <MaintenanceIntel vehicles={vehicles} />
                                        <div className="p-8 bg-white border border-zinc-100 rounded-[3rem] shadow-xl shadow-zinc-200/20">
                                            <TelemetryFeed />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-4">
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900">Unités de Terrain</h3>
                                        <div className="flex gap-2">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400"><Search size={18} /></div>
                                            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400"><Filter size={18} /></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                        {vehicles.map(v => (
                                            <VehicleCard key={v.id} vehicle={v} position={fleetPositions.find(p => p.vehicle_id === v.id)} />
                                        ))}
                                        {vehicles.length === 0 && (
                                            <div className="col-span-full py-20 bg-zinc-50 border-2 border-dashed border-zinc-100 rounded-[3rem] flex flex-col items-center justify-center gap-4">
                                                <Truck className="text-zinc-200" size={48} />
                                                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Aucun véhicule enregistré dans la flotte.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'rapports' && (
                            <motion.div key="rapports" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] border border-zinc-100 shadow-2xl shadow-zinc-200/20">
                                        <div className="flex justify-between items-center mb-12">
                                            <div>
                                                <h3 className="text-3xl font-black uppercase italic tracking-tighter text-zinc-900 leading-none">Impact Territorial</h3>
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">Mesure de la performance environnementale</p>
                                            </div>
                                            <span className="px-5 py-2.5 bg-emerald-50 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-emerald-100 shadow-sm"><Leaf size={14} />Performance ÉCO</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="space-y-6">
                                                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">CO2 Évité (Territoire)</p>
                                                <p className="text-6xl font-black italic tracking-tighter text-emerald-500">{(collectedWastes * 1.5).toFixed(1)} <span className="text-2xl text-zinc-300">kg</span></p>
                                                <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-50">
                                                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm"><Zap size={14} /></div>
                                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight leading-none">Équivalent à {Math.round(collectedWastes * 0.05)} arbres plantés ce mois-ci.</p>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Volume Recyclé Total</p>
                                                <p className="text-6xl font-black italic tracking-tighter text-zinc-900">{wastes.reduce((acc, w) => acc + (w.status === 'collected' ? (w.final_weight || w.estimated_weight || 0) : 0), 0)} <span className="text-2xl text-zinc-300">kg</span></p>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-400"><span>Objectif Mensuel</span><span>65%</span></div>
                                                    <div className="w-full h-2.5 bg-zinc-50 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-zinc-900 w-[65%] rounded-full" /></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-900 p-12 rounded-[4rem] text-white flex flex-col justify-between group relative overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] min-h-[450px]">
                                        <TrendingUp className="absolute top-10 right-10 text-white/[0.03] w-48 h-48 -rotate-12 transition-transform group-hover:scale-110" />
                                        <div>
                                            <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mb-10"><BarChart3 size={28} className="text-emerald-500" /></div>
                                            <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4 leading-none">Rapport <br/> Décisionnel</h3>
                                            <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest leading-loose mb-10 opacity-60">Accédez à l'analyse complète multicritères et prévisionnelle de votre commune.</p>
                                        </div>
                                        <button onClick={() => router.push('/city-os/rapports')} className="w-full py-6 bg-emerald-500 text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-4 group-hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20">CONSULTER LE RAPPORT GLOBAL<ArrowUpRight size={18} /></button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <Modal isOpen={isAddTenderModalOpen} onClose={() => setIsAddTenderModalOpen(false)} title="Lancer une Mise en Concurrence">
                <form onSubmit={handleCreateTender} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Zone Stratégique</label>
                        <select required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black uppercase outline-none" value={newTender.zone_id} onChange={(e) => setNewTender({...newTender, zone_id: e.target.value})}>
                            <option value="">Sélectionner une zone...</option>
                            {zones.filter(z => z.status === 'available').map(z => (<option key={z.id} value={z.id}>{z.name}</option>))}
                        </select>
                    </div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Titre du Marché</label><input required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black uppercase outline-none" placeholder="Titre du Marché" value={newTender.title} onChange={(e) => setNewTender({...newTender, title: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Description technique</label><textarea required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium min-h-[100px] outline-none" placeholder="Détails techniques..." value={newTender.description} onChange={(e) => setNewTender({...newTender, description: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Budget (CFA)</label><input type="number" required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black uppercase outline-none" placeholder="CFA" value={newTender.budget_estimate} onChange={(e) => setNewTender({...newTender, budget_estimate: parseInt(e.target.value)})} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Clôture</label><input type="date" required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black uppercase outline-none" value={newTender.end_date} onChange={(e) => setNewTender({...newTender, end_date: e.target.value})} /></div>
                    </div>
                    <button type="submit" className="w-full py-5 bg-emerald-500 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.01] transition-all">Diffuser l'Appel d'Offres</button>
                </form>
            </Modal>

            <Modal isOpen={isAddZoneModalOpen} onClose={() => setIsAddZoneModalOpen(false)} title="🏛️ CENTRE DE COMMANDE : NOUVELLE CONCESSION">
                 <form onSubmit={async (e) => {
                     e.preventDefault();
                     setLoading(true);
                     const { data: createdZone, error: zoneError } = await supabase.from('zones').insert([newZone]).select().single();
                     if (zoneError) { showToast("Erreur zone", "error"); setLoading(false); return; }
                     if (isAttributingDirectly && selectedOrgId) {
                        const assignResult = await assignConcessionDirectly({ zone_id: createdZone.id, organization_id: selectedOrgId, duration_months: concessionDuration });
                        if (assignResult.success) showToast("Concession attribuée", "success");
                     }
                     fetchMairieData(); setIsAddZoneModalOpen(false); setLoading(false);
                 }} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom de la Zone</label><input required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black uppercase outline-none" placeholder="Nom de la Zone" value={newZone.name} onChange={(e) => setNewZone({...newZone, name: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Ville</label><input required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black uppercase outline-none" placeholder="Ville" value={newZone.city} onChange={(e) => setNewZone({...newZone, city: e.target.value})} /></div>
                    </div>
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] space-y-4">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Attribution Directe</span><button type="button" onClick={() => setIsAttributingDirectly(!isAttributingDirectly)} className={cn("w-12 h-6 rounded-full p-1 transition-all", isAttributingDirectly ? "bg-emerald-500" : "bg-gray-200")}><div className={cn("bg-white w-4 h-4 rounded-full shadow-sm transition-all", isAttributingDirectly ? "ml-6" : "ml-0")} /></button></div>
                        {isAttributingDirectly && (
                            <div className="space-y-4 pt-4 border-t border-emerald-100">
                                <select className="w-full px-6 py-4 bg-white border border-emerald-200 rounded-2xl text-[10px] font-black uppercase outline-none" value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} required={isAttributingDirectly}><option value="">Choisir une organisation...</option>{organizations.map(org => (<option key={org.id} value={org.id}>{org.full_name} — Score: {org.performanceScore}/5</option>))}</select>
                                <select className="w-full px-6 py-4 bg-white border border-emerald-200 rounded-2xl text-[10px] font-black uppercase outline-none" value={concessionDuration} onChange={(e) => setConcessionDuration(parseInt(e.target.value))}><option value={6}>6 mois</option><option value={12}>12 mois</option><option value={24}>24 mois</option></select>
                            </div>
                        )}
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-5 bg-zinc-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest disabled:opacity-50 hover:scale-[1.01] transition-all">{loading ? "Traitement..." : "Valider la Concession"}</button>
                 </form>
            </Modal>

            <Modal isOpen={isSanctionModalOpen} onClose={() => setIsSanctionModalOpen(false)} title="⚖️ CENTRE DE SANCTION">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <button className="p-6 bg-gray-50 border border-gray-100 rounded-2xl text-left hover:border-red-500 transition-all group"><Clock className="text-zinc-400 group-hover:text-red-500 mb-2 transition-colors" size={20} /><p className="text-[10px] font-black uppercase">Retard Collecte</p></button>
                        <button className="p-6 bg-gray-50 border border-gray-100 rounded-2xl text-left hover:border-red-500 transition-all group"><Trash2 className="text-zinc-400 group-hover:text-red-500 mb-2 transition-colors" size={20} /><p className="text-[10px] font-black uppercase">Dépôt Sauvage</p></button>
                    </div>
                    <button onClick={() => { showToast("Sanction envoyée", "success"); setIsSanctionModalOpen(false); }} className="w-full py-5 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 hover:scale-[1.01] transition-all">Émettre la Sanction</button>
                </div>
            </Modal>

            <Modal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} title="🏛️ AUDIT RÉGIE FINANCIÈRE">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100"><p className="text-[8px] font-black uppercase text-emerald-600 mb-1">Revenus</p><p className="text-2xl font-black italic tracking-tighter text-zinc-900">{transactions.reduce((acc, tx) => acc + (tx.type === 'income' ? Number(tx.amount) : 0), 0).toLocaleString()} <span className="text-[10px]">CFA</span></p></div>
                        <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100"><p className="text-[8px] font-black uppercase text-blue-600 mb-1">Transactions</p><p className="text-2xl font-black italic tracking-tighter text-zinc-900">{transactions.length}</p></div>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="p-4 bg-gray-50 border border-zinc-100 rounded-2xl flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="text-zinc-400 italic">{new Date(tx.created_at).toLocaleDateString()}</span><span className="text-zinc-900">{tx.description}</span><span className="text-emerald-500">+{Number(tx.amount).toLocaleString()}</span></div>
                        ))}
                    </div>
                    <button className="w-full py-5 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"><Printer size={14} />Imprimer le rapport fiscal</button>
                </div>
            </Modal>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .text-shadow-glow-emerald { text-shadow: 0 0 10px rgba(16, 185, 129, 0.2); }
            `}</style>
        </div>
    );
}

function KPIStoreCard({ label, value, icon: Icon, trend, color, progress, isAlert }: any) {
    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className={cn(
                "p-6 bg-white dark:bg-zinc-900 border rounded-3xl shadow-xl transition-all relative overflow-hidden group",
                isAlert ? "border-red-500/50 shadow-red-500/5" : "border-gray-100 dark:border-zinc-800"
            )}
        >
            <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 -mr-16 -mt-16 rounded-full transition-all group-hover:opacity-20", color)} />
            
            <div className="flex justify-between items-start mb-6">
                <div className={cn("p-4 rounded-2xl", color.replace('bg-', 'bg-').concat('/10'), color.replace('bg-', 'text-'))}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <span className={cn(
                        "text-[9px] font-black px-2 py-1 rounded-full uppercase italic",
                        trend.includes('+') ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
                    )}>
                        {trend}
                    </span>
                )}
            </div>

            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">{label}</p>
            <div className="flex items-baseline gap-2 mb-4">
                <p className={cn("text-4xl font-black italic tracking-tighter dark:text-white", isAlert && "text-red-600")}>{value}</p>
            </div>

            <div className="w-full h-1 bg-gray-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={cn("h-full", color)}
                />
            </div>
        </motion.div>
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
