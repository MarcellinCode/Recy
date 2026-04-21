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
import { createTender, awardTender } from "@/app/actions/tenders";
import { issueSanction } from "@/app/actions/mairie";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/Modal";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { 
    assignConcessionDirectly, 
    getOrganizationsForConcession, 
    revokeConcession, 
    checkAndCleanupExpiredConcessions 
} from "@/app/actions/concessions";
import { 
    createPoliceAgent, 
    getPoliceAgents 
} from "@/app/actions/police-agents";
import { 
    reportInfraction, 
    updateInfractionStatus, 
    convertInfractionToSanction, 
    getInfractionStats 
} from "@/app/actions/police-verte";
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
    const [activeTab, setActiveTab] = useState<'overview' | 'tenders' | 'sovereignty' | 'fleet' | 'police' | 'rapports'>('overview');
    const [zones, setZones] = useState<any[]>([]);
    const [pendingConcessions, setPendingConcessions] = useState<any[]>([]);
    const [wastes, setWastes] = useState<any[]>([]);
    const [tenders, setTenders] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [sanctions, setSanctions] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [fleetPositions, setFleetPositions] = useState<any[]>([]);
    const [isIAOptimizing, setIsIAOptimizing] = useState(false);
    
    const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
    const [isAddTenderModalOpen, setIsAddTenderModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [isSanctionModalOpen, setIsSanctionModalOpen] = useState(false);
    const [isInfractionDetailModalOpen, setIsInfractionDetailModalOpen] = useState(false);
    const [isAddAgentModalOpen, setIsAddAgentModalOpen] = useState(false);
    
    const [infractions, setInfractions] = useState<any[]>([]);
    const [policeAgents, setPoliceAgents] = useState<any[]>([]);
    const [infractionStats, setInfractionStats] = useState<any>(null);
    const [selectedInfraction, setSelectedInfraction] = useState<any>(null);
    const [penaltyAmount, setPenaltyAmount] = useState(50000);
    
    const [newAgent, setNewAgent] = useState({ fullName: "", email: "", password: "", phone: "", city: "Abidjan", zoneId: "" });
    const [sanctionForm, setSanctionForm] = useState({ orgId: "", type: "RETARD COLLECTE", description: "", amount: 0, severity: "medium" as any });
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
            const { data: sanctionsData } = await supabase.from('sanctions').select('*, profiles:organization_id(full_name)').order('created_at', { ascending: false });
            const { data: infractionsData } = await supabase.from('environmental_infractions').select('*, profiles:reporter_id(full_name), zones:zone_id(name)').order('created_at', { ascending: false });

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
            setSanctions(sanctionsData || []);
            setInfractions(infractionsData || []);

            const agentsRes = await getPoliceAgents();
            if (agentsRes.success) setPoliceAgents(agentsRes.agents || []);

            const infractionStatsRes = await getInfractionStats();
            if (infractionStatsRes.success) setInfractionStats(infractionStatsRes.stats);

            const orgsResult = await getOrganizationsForConcession();
            if (orgsResult.success) {
                // Filtrer les organisations avec un score critique
                const enrichedOrgs = (orgsResult.organizations || []).map((org: any) => ({
                    ...org,
                    isSuspended: (org.performance_score || 5) < 2.5
                }));
                setOrganizations(enrichedOrgs);
            }

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
                            { id: 'police', label: 'POLICE VERTE', icon: ShieldCheck },
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
                            <motion.div key="sovereignty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="bg-white border border-zinc-100 p-12 rounded-[4rem] shadow-2xl shadow-zinc-200/20 flex flex-col justify-between group overflow-hidden relative min-h-[400px]">
                                        <AlertOctagon className="absolute -right-12 -top-12 text-red-500/5 w-64 h-64 rotate-12 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10">
                                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-8 shadow-sm"><ShieldAlert size={32} /></div>
                                            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-900 leading-none mb-4">Unités de <br />Sanction</h2>
                                            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">Gestion stricte des litiges, retards de collecte et pénalités contractuelles.</p>
                                        </div>
                                        <button onClick={() => setIsSanctionModalOpen(true)} className="w-full py-7 bg-red-600 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-red-600/30 hover:scale-[1.01] transition-transform relative z-10">ÉMETTRE UNE SANCTION</button>
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
                                </div>

                                <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] border border-zinc-100 p-10 shadow-xl shadow-zinc-200/20">
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 text-zinc-900">Registre des Sanctions Administratives</h3>
                                    <div className="space-y-4">
                                        {sanctions.map((s) => (
                                            <div key={s.id} className="flex items-center justify-between p-6 bg-white border border-zinc-50 rounded-[2rem] hover:shadow-lg transition-all">
                                                <div className="flex items-center gap-6">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs",
                                                        s.severity === 'high' || s.severity === 'critical' ? "bg-red-50 text-red-600" : "bg-zinc-50 text-zinc-500"
                                                    )}>!</div>
                                                    <div>
                                                        <p className="font-black italic uppercase text-zinc-900">{s.profiles?.full_name || "Organisation"}</p>
                                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{s.type} — {new Date(s.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-red-500">-{s.penalty_amount.toLocaleString()} CFA</p>
                                                    <p className="text-[9px] font-black text-zinc-300 uppercase italic">Pénalité Appliquée</p>
                                                </div>
                                            </div>
                                        ))}
                                        {sanctions.length === 0 && (
                                            <div className="py-20 text-center bg-zinc-50/50 rounded-[3rem] border border-dashed border-zinc-100">
                                                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em]">Aucune sanction enregistrée.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] border border-zinc-100 p-10 shadow-xl shadow-zinc-200/20">
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 text-zinc-900 flex items-center justify-between">
                                        <span>Annuaire des Partenaires Certifiés</span>
                                        <span className="text-[10px] font-black text-zinc-400">SEUIL D'EXCLUSION : 2.5/5.0</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {organizations.map((org) => (
                                            <div key={org.id} className={cn(
                                                "p-8 rounded-[2.5rem] border flex items-center justify-between transition-all",
                                                org.isSuspended ? "bg-red-50 border-red-100 opacity-80" : "bg-white border-zinc-50 hover:border-emerald-500/30"
                                            )}>
                                                <div className="flex items-center gap-5">
                                                    <div className={cn(
                                                        "w-16 h-16 rounded-3xl flex items-center justify-center font-black text-xl",
                                                        org.isSuspended ? "bg-red-500 text-white" : "bg-emerald-50 text-emerald-500"
                                                    )}>
                                                        {org.full_name?.charAt(0) || "P"}
                                                    </div>
                                                    <div>
                                                        <p className="font-black italic uppercase text-zinc-900">{org.full_name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex gap-0.5">
                                                                {[1,2,3,4,5].map(s => (
                                                                    <div key={s} className={cn(
                                                                        "w-3 h-1 rounded-full",
                                                                        s <= (org.performance_score || 5) ? (org.isSuspended ? "bg-red-500" : "bg-emerald-500") : "bg-zinc-100"
                                                                    )} />
                                                                ))}
                                                            </div>
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase",
                                                                org.isSuspended ? "text-red-600" : "text-emerald-600"
                                                            )}>
                                                                Score : {(org.performance_score || 5).toFixed(1)}/5
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {org.isSuspended && (
                                                    <div className="px-4 py-2 bg-red-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest animate-pulse">
                                                        SUSPENDU
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
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

                        {activeTab === 'police' && (
                            <motion.div key="police" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="space-y-10">
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                    <div className="lg:col-span-3 h-[600px] rounded-[4rem] overflow-hidden border border-zinc-200 bg-white relative shadow-2xl shadow-zinc-200/20">
                                        <div className="absolute inset-0 z-0"><MapComponent isMairie={true} /></div>
                                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                            <div className="w-[500px] h-[500px] border border-red-500/10 rounded-full animate-ping opacity-20" />
                                            <div className="absolute w-[300px] h-[300px] border border-red-500/20 rounded-full animate-pulse opacity-20" />
                                        </div>
                                        
                                        {/* Infraction Markers (Simulation visual markers on map) */}
                                        <div className="absolute inset-0 z-20 pointer-events-none p-20">
                                            {infractions.filter(i => i.status === 'open').slice(0, 5).map((inf, idx) => (
                                                <div key={idx} className="absolute animate-bounce" style={{ top: `${20 + idx * 15}%`, left: `${30 + idx * 10}%` }}>
                                                    <div className="p-3 bg-red-600 text-white rounded-2xl shadow-2xl shadow-red-600/40 flex items-center gap-2">
                                                        <AlertTriangle size={14} className="animate-pulse" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">{inf.type}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="absolute bottom-10 left-10 z-30 p-8 bg-zinc-900 text-white rounded-[2.5rem] shadow-2xl space-y-4 max-w-[320px]">
                                            <h4 className="text-xl font-black italic uppercase tracking-tighter leading-none border-b border-white/10 pb-4">STATUT RADAR</h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-zinc-400 uppercase">Alertes Actives</span><span className="text-sm font-black text-red-500">{infractionStats?.open || 0}</span></div>
                                                <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-zinc-400 uppercase">Points Critiques</span><span className="text-sm font-black text-amber-500">{infractionStats?.critical || 0}</span></div>
                                                <div className="flex justify-between items-center pt-2 border-t border-white/5"><span className="text-[9px] font-bold text-emerald-500 uppercase">Système IA</span><span className="text-[9px] font-black bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-400">NOMINAL</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 overflow-y-auto pr-2 no-scrollbar">
                                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] pl-4">INCIDENTS RÉCENTS</h3>
                                        {infractions.map((inf) => (
                                            <button 
                                                key={inf.id} 
                                                onClick={() => { setSelectedInfraction(inf); setIsInfractionDetailModalOpen(true); }}
                                                className="w-full text-left p-6 bg-white border border-zinc-100 rounded-[2.5rem] hover:border-red-500/30 transition-all group relative overflow-hidden"
                                            >
                                                <div className={cn(
                                                    "absolute top-0 right-0 p-3 text-[7px] font-black uppercase tracking-widest rounded-bl-xl",
                                                    inf.status === 'open' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    {inf.status}
                                                </div>
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-red-500 transition-colors">
                                                        <Trash2 size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black italic uppercase text-zinc-900 leading-none mb-1">{inf.type}</p>
                                                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{inf.zones?.name || "Zone non définie"}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                        {infractions.length === 0 && (
                                            <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-[3rem]">
                                                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest italic leading-loose">Aucun incident <br /> détecté par le RADAR.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="p-10 bg-zinc-950 rounded-[3.5rem] text-white flex flex-col justify-between group overflow-hidden relative min-h-[350px]">
                                        <Megaphone className="absolute -right-8 -top-8 text-white/5 w-48 h-48 -rotate-12 transition-transform group-hover:rotate-0" />
                                        <div className="relative z-10">
                                            <h3 className="text-3xl font-black italic tracking-tighter mb-4 leading-none text-red-500">ALERTE <br /> GÉNÉRALE</h3>
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] leading-relaxed mb-10 opacity-70">Diffuser un ordre de salubrité immédiat à tous les collecteurs du district.</p>
                                        </div>
                                        <button className="w-full py-6 bg-white/10 backdrop-blur-xl border border-white/10 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-zinc-900 transition-all">LANCER LE SIGNAL D'URGENCE</button>
                                    </div>
                                    <div className="lg:col-span-2 p-10 bg-white border border-zinc-100 rounded-[3.5rem] shadow-xl shadow-zinc-200/10">
                                        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 text-zinc-900">Registre des Infractions Clôturées</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {infractions.filter(i => i.status === 'resolved' || i.status === 'sanctionne').slice(0, 4).map((inf) => (
                                                <div key={inf.id} className="p-5 bg-zinc-50/50 rounded-3xl border border-zinc-50 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                         <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={16} /></div>
                                                         <div>
                                                             <p className="text-[10px] font-black text-zinc-900 uppercase">{inf.type}</p>
                                                             <p className="text-[8px] font-bold text-zinc-400 uppercase">{new Date(inf.created_at).toLocaleDateString()}</p>
                                                         </div>
                                                    </div>
                                                    <ArrowUpRight size={14} className="text-zinc-300" />
                                                </div>
                                            ))}
                                            {infractions.filter(i => i.status === 'resolved' || i.status === 'sanctionne').length === 0 && (
                                                <div className="col-span-2 py-12 text-center">
                                                    <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest italic opacity-50">Aucun historique disponible.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/70 backdrop-blur-xl rounded-[3.5rem] border border-zinc-100 p-10 shadow-xl shadow-zinc-200/20">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900">EFFECTIFS POLICE VERTE</h3>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Agents assermentés rattachés à la municipalité</p>
                                        </div>
                                        <button 
                                            onClick={() => setIsAddAgentModalOpen(true)}
                                            className="px-6 py-3 bg-zinc-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-transform"
                                        >
                                            <Plus size={14} /> RECRUTER UN AGENT
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {policeAgents.map((agent) => (
                                            <div key={agent.id} className="p-6 bg-white border border-zinc-50 rounded-[2.5rem] hover:shadow-lg transition-all flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black italic">
                                                        {agent.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black italic uppercase text-zinc-900">{agent.full_name}</p>
                                                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{agent.zones?.name || "Patrouille Libre"}</p>
                                                    </div>
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            </div>
                                        ))}
                                        {policeAgents.length === 0 && (
                                            <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-100 rounded-[3rem]">
                                                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em]">Aucune recrue enregistrée.</p>
                                            </div>
                                        )}
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
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!sanctionForm.orgId) { showToast("Veuillez choisir une organisation", "error"); return; }
                    setLoading(true);
                    const res = await issueSanction(sanctionForm.orgId, sanctionForm.type, sanctionForm.description, sanctionForm.severity, sanctionForm.amount);
                    if (res.success) {
                        showToast("Sanction enregistrée et notifiée", "success");
                        setIsSanctionModalOpen(false);
                        fetchMairieData();
                    } else {
                        showToast("Erreur: " + res.error, "error");
                    }
                    setLoading(false);
                }} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Organisation Cible</label>
                        <select 
                            required 
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none"
                            value={sanctionForm.orgId}
                            onChange={(e) => setSanctionForm({...sanctionForm, orgId: e.target.value})}
                        >
                            <option value="">Sélectionner...</option>
                            {organizations.map(org => (<option key={org.id} value={org.id}>{org.full_name}</option>))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Type de Litige</label>
                            <select 
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black outline-none"
                                value={sanctionForm.type}
                                onChange={(e) => setSanctionForm({...sanctionForm, type: e.target.value})}
                            >
                                <option value="RETARD COLLECTE">RETARD COLLECTE</option>
                                <option value="DÉPÔT SAUVAGE">DÉPÔT SAUVAGE</option>
                                <option value="DÉFAUT MAINTENANCE">DÉFAUT MAINTENANCE</option>
                                <option value="AUTRE">AUTRE</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Gravité</label>
                            <select 
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black outline-none"
                                value={sanctionForm.severity}
                                onChange={(e) => setSanctionForm({...sanctionForm, severity: e.target.value})}
                            >
                                <option value="low">FAIBLE</option>
                                <option value="medium">MOYENNE</option>
                                <option value="high">ÉLEVÉE</option>
                                <option value="critical">CRITIQUE</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Pénalité (CFA)</label>
                        <input 
                            type="number"
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none"
                            placeholder="Montant en CFA"
                            value={sanctionForm.amount}
                            onChange={(e) => setSanctionForm({...sanctionForm, amount: parseInt(e.target.value)})}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Description / Justification</label>
                        <textarea 
                            required
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium min-h-[80px] outline-none"
                            placeholder="Détails du manquement..."
                            value={sanctionForm.description}
                            onChange={(e) => setSanctionForm({...sanctionForm, description: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-5 bg-red-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 disabled:opacity-50"
                    >
                        {loading ? "Traitement..." : "Appliquer la Sanction"}
                    </button>
                </form>
            </Modal>

            <Modal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} title="🏛️ AUDIT RÉGIE FINANCIÈRE">
                <div className="space-y-10">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="p-10 bg-emerald-50 rounded-[3rem] border border-emerald-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
                            <p className="text-[10px] font-black uppercase text-emerald-600 mb-4 tracking-[0.2em] relative z-10">Éco-Taxes Perçues</p>
                            <p className="text-5xl font-black italic tracking-tighter text-emerald-700 relative z-10">
                                {transactions
                                    .filter(tx => tx.type === 'income')
                                    .reduce((acc, tx) => acc + Number(tx.amount), 0)
                                    .toLocaleString()} <span className="text-xl">CFA</span>
                            </p>
                        </div>
                        <div className="p-10 bg-zinc-900 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
                            <p className="text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-[0.2em] relative z-10">Actes Administratifs</p>
                            <p className="text-5xl font-black italic tracking-tighter text-white relative z-10">
                                {transactions.length}
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-white border border-zinc-100 rounded-[3rem] p-10 shadow-xl shadow-zinc-200/20">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 mb-8 flex items-center gap-3">
                            <Activity size={16} className="text-emerald-500" />
                            Registre des Flux de Trésorerie Territoriale
                        </h4>
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-6 no-scrollbar">
                            {transactions.length === 0 && <p className="text-center py-20 text-[10px] font-black text-zinc-300 uppercase italic">Aucune transaction enregistrée</p>}
                            {transactions.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(tx => (
                                <div key={tx.id} className="flex justify-between items-center p-6 bg-zinc-50/50 border border-zinc-100 rounded-3xl hover:border-emerald-500/30 transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-zinc-900 leading-none mb-1">{tx.description || "PERCEPTION RÉGILE"}</span>
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase">{new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <span className={cn(
                                        "text-lg font-black italic tracking-tighter",
                                        tx.type === 'income' ? "text-emerald-600" : "text-red-500"
                                    )}>
                                        {tx.type === 'income' ? '+' : '-'}{Math.abs(Number(tx.amount)).toLocaleString()} <span className="text-[10px]">CFA</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="w-full py-7 bg-zinc-900 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-zinc-900/30 flex items-center justify-center gap-4 hover:scale-[1.01] transition-transform">
                        <Printer size={18} />
                        Générer l'Audit Certifié (PDF)
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isInfractionDetailModalOpen} onClose={() => setIsInfractionDetailModalOpen(false)} title="⚖️ ADJUDICATION POLICE VERTE">
                 {selectedInfraction && (
                     <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="p-8 bg-zinc-900 rounded-[3rem] text-white relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <h4 className="text-[9px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Type d'Infraction</h4>
                                    <p className="text-3xl font-black italic uppercase tracking-tighter text-red-500 leading-none">{selectedInfraction.type}</p>
                                    <div className="mt-8 flex items-center gap-3">
                                        <div className="p-2 bg-white/5 rounded-lg"><MapPin size={12} className="text-zinc-500" /></div>
                                        <p className="text-[10px] font-bold uppercase text-zinc-300">{selectedInfraction.zones?.name || "Coordonnées GPS directes"}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest ml-4">Preuve Capturée</h4>
                                    <div className="aspect-video w-full bg-zinc-100 rounded-[2.5rem] border border-zinc-200 overflow-hidden flex items-center justify-center italic text-[10px] text-zinc-400">
                                        {selectedInfraction.images?.[0] ? <img src={selectedInfraction.images[0]} className="w-full h-full object-cover" /> : "Image Terrain Indisponible"}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="p-8 bg-emerald-50 rounded-[3rem] border border-emerald-100">
                                    <h4 className="text-[10px] font-black uppercase text-emerald-600 mb-4 tracking-widest flex items-center gap-2">
                                        <Zap size={14} /> ANALYSE IA AIDA
                                    </h4>
                                    <p className="text-xs font-bold text-emerald-800 leading-relaxed italic uppercase">
                                        "L'IA a détecté une accumulation de déchets plastiques non broyés en zone urbaine. Risque sanitaire modéré. Délai de résolution contractuel dépassé."
                                    </p>
                                </div>

                                <div className="space-y-4 pt-10 border-t border-zinc-100">
                                    <h4 className="text-[10px] font-black uppercase text-zinc-900 tracking-[0.2em]">ACTIONS RÉGALIENNES</h4>
                                    
                                    <div className="space-y-3">
                                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Montant Sanction</span>
                                            <input 
                                                type="number" 
                                                className="w-24 bg-transparent border-none text-right font-black text-sm outline-none text-red-600"
                                                value={penaltyAmount}
                                                onChange={(e) => setPenaltyAmount(parseInt(e.target.value))}
                                            />
                                        </div>
                                        
                                        <button 
                                            onClick={async () => {
                                                setLoading(true);
                                                const res = await convertInfractionToSanction(selectedInfraction.id, penaltyAmount);
                                                if (res.success) {
                                                    showToast("Sanction appliquée avec succès", "success");
                                                    setIsInfractionDetailModalOpen(false);
                                                    fetchMairieData();
                                                } else showToast(res.error, "error");
                                                setLoading(false);
                                            }}
                                            disabled={loading || !selectedInfraction.responsible_org_id || selectedInfraction.status === 'sanctioned'}
                                            className="w-full py-5 bg-red-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/30 flex items-center justify-center gap-3 disabled:grayscale"
                                        >
                                            <Gavel size={16} /> ÉMETTRE LA SANCTION FINANCIÈRE
                                        </button>

                                        <button 
                                            onClick={async () => {
                                                setLoading(true);
                                                const res = await updateInfractionStatus(selectedInfraction.id, 'resolved');
                                                if (res.success) {
                                                    showToast("Incident résolu", "success");
                                                    setIsInfractionDetailModalOpen(false);
                                                    fetchMairieData();
                                                } else showToast(res.error, "error");
                                                setLoading(false);
                                            }}
                                            disabled={loading || selectedInfraction.status === 'resolved'}
                                            className="w-full py-5 bg-zinc-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            <CheckCircle2 size={16} /> CLASSÉ SANS SUITE / RÉSOLU
                                        </button>
                                    </div>

                                    {!selectedInfraction.responsible_org_id && (
                                        <p className="text-[9px] font-bold text-red-400 uppercase italic text-center px-6">
                                            ⚠️ Aucune organisation n'est responsable de cette zone. La sanction financière directe est impossible.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                     </div>
                 )}
            </Modal>

            <Modal isOpen={isAddAgentModalOpen} onClose={() => setIsAddAgentModalOpen(false)} title="📋 RECRUTEMENT DE NOUVEL AGENT (POLICE VERTE)">
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    setLoading(true);
                    const res = await createPoliceAgent(newAgent);
                    if (res.success) {
                        showToast("Officier recruté avec succès", "success");
                        setIsAddAgentModalOpen(false);
                        fetchMairieData();
                    } else showToast(res.error, "error");
                    setLoading(false);
                }} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom Complet de l'Officier</label>
                        <input required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none" value={newAgent.fullName} onChange={(e) => setNewAgent({...newAgent, fullName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Email Professionnel</label><input type="email" required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none" value={newAgent.email} onChange={(e) => setNewAgent({...newAgent, email: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Mot de Passe Initial</label><input type="password" required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none" value={newAgent.password} onChange={(e) => setNewAgent({...newAgent, password: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Numéro de Téléphone</label><input required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none" value={newAgent.phone} onChange={(e) => setNewAgent({...newAgent, phone: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Zone d'Affectation</label>
                            <select className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none" value={newAgent.zoneId} onChange={(e) => setNewAgent({...newAgent, zoneId: e.target.value})}>
                                <option value="">Choisir une zone...</option>
                                {zones.map(z => (<option key={z.id} value={z.id}>{z.name}</option>))}
                            </select>
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20">
                        {loading ? "Génération du badge..." : "CRÉER LE COMPTE AGENT"}
                    </button>
                    <p className="text-[8px] font-bold text-center text-zinc-400 uppercase tracking-widest">L'agent pourra se connecter sur l'app mobile immédiatement avec ces identifiants.</p>
                </form>
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
