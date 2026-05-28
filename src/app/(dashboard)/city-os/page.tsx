"use client";

import { MapPin, Navigation, Plus, CheckCircle2, XCircle, ArrowUpRight, Building2, ShieldCheck, Activity, Trash2, AlertOctagon, Megaphone, Gavel, ShieldAlert, BarChart3, Truck, Globe, TrendingUp, DollarSign, FileText, Printer, AlertTriangle, Zap, Search, Filter } from "lucide-react";
import React, { useState, useEffect, Suspense } from "react";
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
    updateInfractionStatus, 
    convertInfractionToSanction, 
    getInfractionStats 
} from "@/app/actions/police-verte";
import { getFiscalConfig, saveFiscalConfig } from "@/lib/fiscalConfig";
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

const enrichZonesData = (zonesData: any[], concessionsData: any[], profilesData: any[]) => {
    return zonesData?.map((zone: any) => {
        const concessionsForZone = concessionsData?.filter((c: any) => c.zone_id === zone.id) || [];
        const activeConcession = concessionsForZone.find((c: any) => c.status === 'active');
        return {
            ...zone,
            status: activeConcession ? 'occupied' : 'available',
            concessions: concessionsForZone.map((c: any) => ({
                ...c,
                profiles: profilesData?.find((p: any) => p.id === c.organization_id)
            }))
        };
    }) || [];
};

function getPerformanceBarColor(s: number, score: number, isSuspended: boolean): string {
    if (s > score) return "bg-zinc-800";
    return isSuspended ? "bg-red-500" : "bg-emerald-500";
}

interface MairieRawDataPayload {
    zones: any[];
    wastes: any[];
    tenders: any[];
    transactions: any[];
    sanctions: any[];
    infractions: any[];
    policeAgents: any[];
    infractionStats: any;
    fiscalRates: { commissionRate: number; ecoTaxRate: number } | null;
    organizations: any[];
    vehicles: any[];
    fleetPositions: any[];
    mairieCity: string;
}

async function fetchRawMairieData(
    supabase: any,
    currentUserProfile: any,
    targetMairieId: string | null,
    mairieId: string
): Promise<MairieRawDataPayload> {
    let mairieCity = currentUserProfile?.city || "Abidjan";
    if (currentUserProfile?.role === 'super_admin' && targetMairieId) {
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('city')
            .eq('id', targetMairieId)
            .single();
        mairieCity = targetProfile?.city || "Abidjan";
    }

    let zonesQuery = supabase.from('zones').select('*');
    if (currentUserProfile?.role !== 'super_admin' || targetMairieId) {
        zonesQuery = zonesQuery.eq('organization_id', mairieId);
    }

    // Parallel Stage 1 queries
    const [
        zonesRes,
        wastesRes,
        tendersRes,
        bidsRes,
        txRes,
        sanctionsRes,
        agentsRes,
        infractionStatsRes,
        fetchedRates,
        orgsResult,
        vehiclesRes,
        posRes
    ] = await Promise.all([
        zonesQuery.catch((e: any) => { console.error("Error fetching zones:", e); return { data: null }; }),
        supabase.from('wastes').select('id, status, created_at, estimated_weight, collector_id').catch((e: any) => { console.error("Error fetching wastes:", e); return { data: null }; }),
        supabase.from('tenders').select('*').eq('mairie_id', mairieId).catch((e: any) => { console.error("Error fetching tenders:", e); return { data: null }; }),
        supabase.from('tender_bids').select('*').catch((e: any) => { console.error("Error fetching tender bids:", e); return { data: null }; }),
        supabase.from('transactions').select('*').eq('user_id', mairieId).order('created_at', { ascending: false }).catch((e: any) => { console.error("Error fetching transactions:", e); return { data: null }; }),
        supabase.from('sanctions').select('*, profiles(full_name)').order('created_at', { ascending: false }).catch((e: any) => { console.error("Error fetching sanctions:", e); return { data: null }; }),
        supabase.from('profiles').select('*').eq('role', 'agent_police_verte').order('created_at', { ascending: false }).catch((e: any) => { console.error("Error fetching agents:", e); return { data: [] }; }),
        supabase.from('environmental_infractions').select('status, severity, type').catch((e: any) => { console.error("Error fetching infraction stats:", e); return { data: [] }; }),
        Promise.resolve({ data: null }),
        supabase.from('profiles').select('id, full_name, agent_count, role').in('role', ['entreprise', 'organisation_admin', 'collecteur']).catch((e: any) => { console.error("Error fetching profiles for concessions:", e); return { data: null }; }),
        supabase.from('vehicles').select('*').catch((e: any) => { console.error("Error fetching vehicles:", e); return { data: null }; }),
        supabase.from('agent_live_positions').select('*').catch((e: any) => { console.error("Error fetching agent live positions:", e); return { data: null }; })
    ]);

    const zonesData = zonesRes?.data || [];
    const wastesData = wastesRes?.data || [];
    const tendersData = tendersRes?.data || [];
    const bidsData = bidsRes?.data || [];
    const txData = txRes?.data || [];
    const sanctionsData = sanctionsRes?.data || [];
    const vehiclesData = vehiclesRes?.data || [];
    const posData = posRes?.data || [];

    // Stage 2: Concessions & infractions (which depend on zoneIds from zonesData)
    const zoneIds = zonesData.map((z: any) => z.id) || [];

    let concessionsQuery = supabase.from('concessions').select('*');
    if (currentUserProfile?.role !== 'super_admin' || targetMairieId) {
        if (zoneIds.length > 0) {
            concessionsQuery = concessionsQuery.in('zone_id', zoneIds);
        } else {
            concessionsQuery = concessionsQuery.eq('id', 'NO_DATA_PREVENT_FETCH');
        }
    }

    let infractionsQuery = supabase.from('environmental_infractions').select('*');
    if (zoneIds.length > 0) {
        infractionsQuery = infractionsQuery.in('zone_id', zoneIds);
    }
    infractionsQuery = infractionsQuery.order('created_at', { ascending: false });

    const [concessionsRes, infractionsRes] = await Promise.all([
        concessionsQuery.catch((e: any) => { console.error("Error fetching concessions:", e); return { data: null }; }),
        infractionsQuery.catch((e: any) => { console.error("Error fetching infractions:", e); return { data: null }; })
    ]);

    const concessionsData = concessionsRes?.data || [];
    const rawInfractionsData = infractionsRes?.data || [];
    const infractionsData = rawInfractionsData.map((inf: any) => ({
        ...inf,
        zones: zonesData.find((z: any) => z.id === inf.zone_id)
    }));

    // Stage 3: Fetch profiles based on concession organization IDs and profiles IDs
    const profileIds = [...new Set([
        ...(concessionsData.map((c: any) => c.organization_id) || []),
        ...(concessionsData.map((c: any) => c.profiles?.id) || [])
    ].filter(Boolean))];

    let profilesData: any[] = [];
    if (profileIds.length > 0) {
        const profilesRes = await supabase.from('profiles').select('id, full_name, role').in('id', profileIds).catch((e: any) => { console.error("Error fetching profiles:", e); return { data: null }; });
        profilesData = profilesRes?.data || [];
    }

    // Enrich zones and tenders using resolved values
    const enrichedZones = enrichZonesData(zonesData, concessionsData, profilesData);
    const enrichedTenders = enrichTendersData(tendersData, bidsData, profilesData);

    const orgsData = orgsResult?.data || [];
    const wastesForPerformance = wastesData || [];
    
    const enrichedOrgs = orgsData.map((org: any) => {
        const orgCollections = wastesForPerformance.filter((w: any) => w.collector_id === org.id);
        const successCount = orgCollections.filter((w: any) => w.status === 'collected').length;
        const totalCount = orgCollections.length;
        
        let score = totalCount > 0 ? (successCount / totalCount) * 5 : 0;
        if (org.agent_count && Number.parseInt(org.agent_count, 10) > 10) score += 0.5;
        const scoreFormatted = Math.min(5, Math.max(0, score)).toFixed(1);
        
        return {
            ...org,
            performanceScore: scoreFormatted,
            totalCollections: successCount,
            isSuspended: Number(scoreFormatted) < 2.5
        };
    }).sort((a: any, b: any) => Number(b.performanceScore) - Number(a.performanceScore));

    const rawAgentsData = agentsRes?.data || [];
    const agentsData = rawAgentsData.map((agent: any) => ({
        ...agent,
        zones: zonesData.find((z: any) => z.id === agent.zone_id)
    }));
    
    const infractionStatsData = infractionStatsRes?.data || [];
    const computedStats = {
        total: infractionStatsData.length,
        open: infractionStatsData.filter((i: any) => i.status === 'open').length,
        critical: infractionStatsData.filter((i: any) => i.severity === 'critical').length,
        types: infractionStatsData.reduce((acc: any, i: any) => {
            acc[i.type] = (acc[i.type] || 0) + 1;
            return acc;
        }, {})
    };

    const computedRates = {
        commissionRate: 0.10,
        ecoTaxRate:     0.02,
    };

    return {
        zones: enrichedZones,
        wastes: wastesData,
        tenders: enrichedTenders,
        transactions: txData,
        sanctions: sanctionsData,
        infractions: infractionsData,
        policeAgents: agentsData,
        infractionStats: computedStats,
        fiscalRates: computedRates,
        organizations: enrichedOrgs,
        vehicles: vehiclesData,
        fleetPositions: posData,
        mairieCity
    };
}

const enrichTendersData = (tendersData: any[], bidsData: any[], profilesData: any[]) => {
    return tendersData?.map((t: any) => ({
        ...t,
        tender_bids: bidsData
            ?.filter((b: any) => b.tender_id === t.id)
            .map((b: any) => ({
                ...b,
                profiles: profilesData?.find((p: any) => p.id === b.organization_id)
            }))
    })) || [];
};

function MairieDashboardContent() {
    const searchParams = useSearchParams();
    const targetMairieId = searchParams.get('id');
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [mairieCity, setMairieCity] = useState("");
    const [zones, setZones] = useState<any[]>([]);
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
    const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false);
    
    const [infractions, setInfractions] = useState<any[]>([]);
    const [policeAgents, setPoliceAgents] = useState<any[]>([]);
    const [infractionStats, setInfractionStats] = useState<any>(null);
    const [selectedInfraction, setSelectedInfraction] = useState<any>(null);
    const [penaltyAmount, setPenaltyAmount] = useState(50000);
    
    const [newAgent, setNewAgent] = useState({ fullName: "", email: "", password: "", phone: "", city: "Abidjan", zoneId: "" });
    const [sanctionForm, setSanctionForm] = useState({ orgId: "", type: "RETARD COLLECTE", description: "", amount: 0, severity: "medium" as any });
    const [newZone, setNewZone] = useState({ name: "", city: "", status: "available", description: "", district: "", commune: "" });
    const [partnerType, setPartnerType] = useState<"entreprise" | "organisation">("entreprise");
    const [isAttributingDirectly, setIsAttributingDirectly] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [concessionDuration, setConcessionDuration] = useState(12);
    const [fiscalRates, setFiscalRates] = useState({ commissionRate: 0.1, ecoTaxRate: 0.02 });

    // Sync forms with mairie location
    useEffect(() => {
        if (mairieCity) {
            setNewZone(prev => ({ ...prev, city: mairieCity }));
            setNewAgent(prev => ({ ...prev, city: mairieCity }));
        }
    }, [mairieCity]);

    // Filet de sécurité : Charger les organisations en direct sur le client si la liste est vide à l'ouverture du modal
    useEffect(() => {
        if (isAddZoneModalOpen && organizations.length === 0) {
            const fetchOrgsDirectly = async () => {
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('id, full_name, agent_count, role')
                        .in('role', ['entreprise', 'organisation_admin', 'collecteur']);
                    
                    if (error) {
                        console.error("Direct fetch of organizations error:", error.message);
                        return;
                    }
                    
                    if (data && data.length > 0) {
                        const enriched = data.map((org: any) => ({
                            ...org,
                            performanceScore: "5.0",
                            totalCollections: 0,
                            isSuspended: false
                        }));
                        setOrganizations(enriched);
                    }
                } catch (e: any) {
                    console.error("Direct fetch of organizations exception:", e?.message);
                }
            };
            fetchOrgsDirectly();
        }
    }, [isAddZoneModalOpen, organizations.length]);
    
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
            const { data: currentUserProfile } = await supabase.from('profiles').select('role, city').eq('id', user.id).single();
            if (currentUserProfile?.role === 'super_admin' && targetMairieId) {
                mairieId = targetMairieId;
            }

            const payload = await fetchRawMairieData(supabase, currentUserProfile, targetMairieId, mairieId);

            setMairieCity(payload.mairieCity);
            setZones(payload.zones);
            setWastes(payload.wastes);
            setTenders(payload.tenders);
            setTransactions(payload.transactions);
            setSanctions(payload.sanctions);
            setInfractions(payload.infractions);
            setPoliceAgents(payload.policeAgents);
            setInfractionStats(payload.infractionStats);
            if (payload.fiscalRates) setFiscalRates(payload.fiscalRates);
            setOrganizations(payload.organizations);
            setVehicles(payload.vehicles);
            setFleetPositions(payload.fleetPositions);

            setLiveEvents(prev => [{ id: Date.now(), type: "SYSTÈME", message: "Radar initialisé avec succès.", timestamp: new Date() }, ...prev.slice(0, 5)]);
        } catch (err: any) {
            console.error("fetchMairieData CRITICAL error:", err?.message);
            showToast("Erreur lors du chargement des données radar", "error");
        } finally {
            setLoading(false);
        }
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

    const handleRevokeConcessionClick = async (concessionId: string, zoneId: string) => {
        if (!confirm(`Révoquer la concession ?`)) return;
        const res = await revokeConcession(concessionId, zoneId);
        if (res.success) fetchMairieData();
    };

    const handleAddZoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showToast("Session expirée", "error");
            setLoading(false);
            return;
        }

        // On s'assure que la zone est liée à la mairie actuelle et on formate
        const zoneToCreate = {
            name: `${newZone.name} (${newZone.commune || 'Générale'})`,
            description: `District: ${newZone.district || 'Non spécifié'} | Commune: ${newZone.commune || 'Non spécifiée'} | ${newZone.description || ''}`,
            organization_id: targetMairieId || user.id
        };

        const { data: createdZone, error: zoneError } = await supabase.from('zones').insert([zoneToCreate]).select().single();
        
        if (zoneError) {
            showToast("Erreur lors de la création de la zone", "error");
            console.error("Zone insert error:", zoneError);
            setLoading(false);
            return;
        }

        if (isAttributingDirectly && selectedOrgId) {
            const assignRes = await assignConcessionDirectly({ 
                zone_id: createdZone.id, 
                organization_id: selectedOrgId, 
                duration_months: concessionDuration 
            });
            if (assignRes.success) {
                showToast("Concession attribuée avec succès", "success");
            } else {
                showToast(assignRes.error || "Erreur d'attribution", "error");
            }
        }

        // Réinitialiser le formulaire
        setNewZone({ name: "", city: mairieCity || "Abidjan", status: "available", description: "", district: "", commune: "" });
        setSelectedOrgId("");
        setIsAttributingDirectly(false);
        setPartnerType("entreprise");

        fetchMairieData();
        setIsAddZoneModalOpen(false);
        setLoading(false);
    };

    const handleIssueSanctionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sanctionForm.orgId) {
            showToast("Veuillez choisir une organisation", "error");
            return;
        }
        setLoading(true);
        const res = await issueSanction(
            sanctionForm.orgId, 
            sanctionForm.type, 
            sanctionForm.description, 
            sanctionForm.severity, 
            sanctionForm.amount
        );
        if (res.success) {
            showToast("Sanction enregistrée et notifiée", "success");
            setIsSanctionModalOpen(false);
            fetchMairieData();
        } else {
            showToast("Erreur: " + res.error, "error");
        }
        setLoading(false);
    };

    const handleConvertInfractionToSanction = async () => {
        if (!selectedInfraction) return;
        setLoading(true);
        const res = await convertInfractionToSanction(selectedInfraction.id, penaltyAmount);
        if (res.success) {
            showToast("Sanction appliquée avec succès", "success");
            setIsInfractionDetailModalOpen(false);
            fetchMairieData();
        } else showToast(res.error, "error");
        setLoading(false);
    };

    const handleResolveInfraction = async () => {
        if (!selectedInfraction) return;
        setLoading(true);
        const res = await updateInfractionStatus(selectedInfraction.id, 'resolved');
        if (res.success) {
            showToast("Incident résolu", "success");
            setIsInfractionDetailModalOpen(false);
            fetchMairieData();
        } else showToast(res.error, "error");
        setLoading(false);
    };

    const handleRecruitAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createPoliceAgent(newAgent);
        if (res.success) {
            showToast("Officier recruté avec succès", "success");
            setIsAddAgentModalOpen(false);
            fetchMairieData();
        } else showToast(res.error, "error");
        setLoading(false);
    };

    const handleSaveFiscalConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await saveFiscalConfig(fiscalRates);
        if (res.success) {
            showToast("Taux fiscaux mis à jour avec succès", "success");
            setIsFiscalModalOpen(false);
            fetchMairieData();
        } else {
            showToast("Erreur: " + res.error, "error");
        }
        setLoading(false);
    };

    const totalWastes = wastes.length;
    const collectedWastes = wastes.filter(w => w.status === 'collected').length;
    const collectionRate = totalWastes > 0 ? Math.round((collectedWastes / totalWastes) * 100) : 0;
    const now = new Date().getTime();
    const slaBreaches = wastes.filter(w => w.status === 'published' && (now - new Date(w.created_at).getTime() > 48 * 3600 * 1000)).length;

    let actionButtonLabel = "DÉPLOYER NOUVELLE ZONE";
    if (activeTab === 'fleet') {
        actionButtonLabel = isIAOptimizing ? "DÉSACTIVER OPTIMISATION" : "LANCER OPTIMISATION IA";
    }

    return (
        <div className="flex h-screen w-full bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-100 text-zinc-900 overflow-hidden select-none">
            {/* Sidebar : Live Intel Feed */}
            <aside className="w-[320px] hidden lg:flex flex-col border-r border-slate-200/50 bg-white/70 backdrop-blur-md p-6 shadow-sm">
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center overflow-hidden">
                            <img src="/images/police_verte_logo.png" alt="City OS" className="w-6 h-6 object-contain" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black italic tracking-tighter uppercase leading-none text-emerald-950 text-shadow-glow-emerald">City OS</h1>
                            <p className="text-[8px] font-black text-emerald-600/70 uppercase tracking-widest mt-1">Souveraineté Numérique</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <LiveTicker events={liveEvents} />
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                    <StatusIndicator label="Système Radar" status="active" />
                    <StatusIndicator label="Collecte Live" status="active" />
                    <StatusIndicator label="Signalements" status={slaBreaches > 0 ? "warning" : "active"} />
                </div>
            </aside>

            {/* Main Cockpit Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-emerald-500/[0.06] blur-[130px] rounded-full pointer-events-none animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-blue-500/[0.06] blur-[110px] rounded-full pointer-events-none" />

                <header className="p-8 flex items-center justify-between z-50">
                    <nav className="flex gap-2 p-1.5 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm">
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
                                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-105" 
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                                )}
                            >
                                {tab.id === 'police' ? <img src="/images/police_verte_logo.png" alt="Police Verte Logo" className={cn("w-3.5 h-3.5 object-contain", activeTab === 'police' ? "brightness-0 invert" : "")} /> : <tab.icon size={14} />}
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
                            "px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg",
                            activeTab === 'fleet' 
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" 
                                : "bg-white/85 backdrop-blur-md border border-slate-200/60 text-slate-850 hover:bg-slate-50 shadow-sm"
                        )}
                    >
                        {actionButtonLabel}
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar p-8 pt-0">
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 relative h-[550px] rounded-[3.5rem] overflow-hidden border border-slate-200/40 bg-white/75 backdrop-blur-md shadow-lg shadow-slate-100 group">
                                        <div className="absolute inset-0 z-0"><MapComponent isMairie={true} targetCity={mairieCity} mairieId={targetMairieId || undefined} /></div>
                                        <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.1)_100%)]" />
                                    </div>
                                    <div className="space-y-8 overflow-y-auto pr-2 no-scrollbar">
                                        <div className="flex justify-center bg-zinc-900 border border-emerald-500/20 rounded-[3rem] py-10 shadow-2xl backdrop-blur-xl bg-gradient-to-br from-emerald-950/90 via-slate-900/95 to-emerald-950/90">
                                            <HoloGauge value={collectionRate} label="SALUBRITÉ COMMUNE" />
                                        </div>
                                        <NeonCard title="SIGNALEMENTS ACTIFS" value={totalWastes} icon={AlertTriangle} color="blue" trend="+12 AUJOURD'HUI" />
                                        <NeonCard title="ZONES CONCÉDÉES" value={zones.filter(z => z.status === 'occupied').length} icon={Globe} color="amber" />
                                        <NeonCard title="DÉPASSEMENTS SLA" value={slaBreaches} icon={ShieldAlert} color="red" trend={slaBreaches > 0 ? "CRITIQUE" : "NOMINAL"} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    <div className="bg-white/80 backdrop-blur-md rounded-[3rem] border border-slate-200/60 p-8 shadow-lg shadow-slate-100 relative overflow-hidden group">
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter mb-8 text-zinc-900">SOUVERAINETÉ & CONCESSIONS</h2>
                                        <div className="space-y-4 relative z-10">
                                            {zones.filter(z => z.status === 'occupied').map((zone) => {
                                                const concession = zone.concessions?.[0];
                                                return (
                                                    <div key={zone.id} className="flex items-center justify-between p-6 bg-slate-50/50 border border-slate-200/40 rounded-[2.5rem] hover:border-emerald-500/30 hover:bg-white transition-all">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-emerald-500 shadow-sm"><Building2 size={24} /></div>
                                                            <div>
                                                                 <p className="font-black italic uppercase text-xl text-zinc-900 leading-none mb-2">{concession?.profiles?.full_name || "MUNICIPAL"}</p>
                                                                 <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em]">{zone.name}</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleRevokeConcessionClick(concession.id, zone.id)} className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-xl"><XCircle size={20} /></button>
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
                                    <div className="bg-white/85 backdrop-blur-md rounded-[3rem] p-8 flex flex-col justify-between overflow-hidden shadow-lg shadow-slate-100 relative border border-slate-200/60">
                                        <TrendingUp className="absolute -right-4 -top-4 text-zinc-900/5 w-48 h-48" />
                                        <div className="relative z-10">
                                            <h3 className="text-3xl font-black italic tracking-tighter text-zinc-900 mb-2 leading-none">AUDIT <br /> TERRITORIAL</h3>
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
                                        <div key={tender.id} className="bg-white/80 backdrop-blur-md border border-slate-200/50 p-8 rounded-[3.5rem] shadow-lg shadow-slate-100 group hover:border-emerald-500/30 transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity text-zinc-900"><Gavel size={64} /></div>
                                            <h3 className="text-2xl font-black italic uppercase text-zinc-900 mb-2 leading-none">{tender.title}</h3>
                                            <p className="text-zinc-500 text-[10px] font-bold mb-10 line-clamp-3 uppercase tracking-wider leading-relaxed">{tender.description}</p>
                                            
                                            <div className="space-y-4">
                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Offres Reçues ({tender.tender_bids?.length || 0})</p>
                                                {tender.tender_bids?.map((bid: any) => (
                                                    <div key={bid.id} className="p-5 bg-slate-50/50 rounded-2xl flex items-center justify-between border border-slate-200/40 hover:border-emerald-500/30 transition-all">
                                                        <div>
                                                            <p className="text-[10px] font-black text-zinc-900 italic uppercase">{bid.profiles?.full_name}</p>
                                                            <p className="text-[8px] font-bold text-emerald-500">SCORE: {bid.profiles?.performanceScore || '4.8'}/5</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleAwardTender(tender.id, bid.id, bid.organization_id, tender.zone_id)} 
                                                            className="px-5 py-2.5 bg-slate-200/50 text-slate-800 rounded-xl text-[8px] font-black uppercase hover:shadow-md hover:bg-slate-200 transition-all"
                                                        >
                                                            Attribuer
                                                        </button>
                                                    </div>
                                                ))}
                                                {(!tender.tender_bids || tender.tender_bids.length === 0) && (
                                                    <div className="py-10 text-center border-2 border-dashed border-zinc-200 rounded-3xl">
                                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">En attente d'offres...</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setIsAddTenderModalOpen(true)} 
                                        className="aspect-square bg-white/70 backdrop-blur-md border-2 border-dashed border-slate-200 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group shadow-lg shadow-slate-100"
                                    >
                                        <div className="w-20 h-20 rounded-[2rem] bg-gray-50 border border-gray-100 flex items-center justify-center text-zinc-650 group-hover:text-emerald-500 transition-all shadow-inner"><Plus size={40} /></div>
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
                                    <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 p-12 rounded-[4rem] shadow-lg shadow-slate-100 flex flex-col justify-between group overflow-hidden relative min-h-[400px]">
                                        <AlertOctagon className="absolute -right-12 -top-12 text-red-500/5 w-64 h-64 rotate-12 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10">
                                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-8 shadow-sm"><ShieldAlert size={32} /></div>
                                            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-900 leading-none mb-4">Unités de <br />Sanction</h2>
                                            <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">Gestion stricte des litiges, retards de collecte et pénalités contractuelles.</p>
                                        </div>
                                        <button onClick={() => setIsSanctionModalOpen(true)} className="w-full py-7 bg-red-600 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-[1.01] transition-transform relative z-10">ÉMETTRE UNE SANCTION</button>
                                    </div>
                                    <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 p-12 rounded-[4rem] shadow-lg shadow-slate-100 flex flex-col justify-between group overflow-hidden relative min-h-[400px]">
                                        <DollarSign className="absolute -right-12 -top-12 text-emerald-500/5 w-64 h-64 -rotate-12 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10">
                                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mb-8 shadow-sm"><Activity size={32} /></div>
                                            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-900 leading-none mb-4">Régie <br />Financière</h2>
                                            <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">Surveillance temps réel des flux fiscaux et des redevances territoriales.</p>
                                        </div>
                                        <div className="flex flex-col gap-3 relative z-10">
                                            <button onClick={() => setIsFiscalModalOpen(true)} className="w-full py-4 bg-gray-50 text-zinc-800 border border-gray-200 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-gray-100 transition-colors">CONFIGURER LA FISCALITÉ</button>
                                            <button onClick={() => setIsAuditModalOpen(true)} className="w-full py-7 bg-gray-100 text-zinc-850 border border-gray-200 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-sm hover:scale-[1.01] transition-transform">LANCER L'AUDIT FISCAL COMPLET</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/80 backdrop-blur-md rounded-[3rem] border border-slate-200/50 p-10 shadow-lg shadow-slate-100">
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 text-zinc-900">Registre des Sanctions Administratives</h3>
                                    <div className="space-y-4">
                                        {sanctions.map((s) => (
                                            <div key={s.id} className="flex items-center justify-between p-6 bg-slate-50/50 border border-slate-200/40 rounded-[2rem] hover:border-red-500/30 transition-all">
                                                <div className="flex items-center gap-6">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs",
                                                        s.severity === 'high' || s.severity === 'critical' ? "bg-red-500/10 text-red-600" : "bg-gray-100 text-zinc-400"
                                                    )}>!</div>
                                                    <div>
                                                        <p className="font-black italic uppercase text-zinc-900">{s.profiles?.full_name || "Organisation"}</p>
                                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{s.type} — {new Date(s.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-red-500">-{s.penalty_amount.toLocaleString()} CFA</p>
                                                    <p className="text-[9px] font-black text-zinc-400 uppercase italic">Pénalité Appliquée</p>
                                                </div>
                                            </div>
                                        ))}
                                        {sanctions.length === 0 && (
                                            <div className="py-20 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Aucune sanction enregistrée.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white/80 backdrop-blur-md rounded-[3rem] border border-slate-200/50 p-10 shadow-lg shadow-slate-100">
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 text-zinc-900 flex items-center justify-between">
                                        <span>Annuaire des Partenaires Certifiés</span>
                                        <span className="text-[10px] font-black text-zinc-400">SEUIL D'EXCLUSION : 2.5/5.0</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {organizations.map((org) => (
                                            <div key={org.id} className={cn(
                                                "p-8 rounded-[2.5rem] border flex items-center justify-between transition-all",
                                                org.isSuspended ? "bg-red-500/5 border-red-500/20 opacity-80" : "bg-slate-50/50 border border-slate-200/40 hover:border-emerald-500/30"
                                            )}>
                                                <div className="flex items-center gap-5">
                                                    <div className={cn(
                                                        "w-16 h-16 rounded-3xl flex items-center justify-center font-black text-xl",
                                                        org.isSuspended ? "bg-red-500 text-white" : "bg-emerald-500/10 text-emerald-500"
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
                                                                        getPerformanceBarColor(s, org.performance_score || 5, org.isSuspended)
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
                                    <div className="lg:col-span-3 relative h-[600px] rounded-[4rem] overflow-hidden border border-slate-200/55 bg-white shadow-md">
                                        <div className="absolute inset-0 z-0"><MapComponent isMairie={true} targetCity={mairieCity} mairieId={targetMairieId || undefined} /></div>
                                        {isIAOptimizing && <RouteOptimizationOverlay />}
                                        <div className="absolute top-8 left-8 z-20 flex gap-4">
                                            <div className="px-6 py-3 bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/40 shadow-xl flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">{vehicles.length} UNITÉS ACTIVES</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <MaintenanceIntel vehicles={vehicles} />
                                        <div className="p-8 bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-[3rem] shadow-lg shadow-slate-100">
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
                                    <div className="lg:col-span-2 bg-white/80 backdrop-blur-md p-12 rounded-[4rem] border border-slate-200/50 shadow-lg shadow-slate-100">
                                        <div className="flex justify-between items-center mb-12">
                                            <div>
                                                <h3 className="text-3xl font-black uppercase italic tracking-tighter text-zinc-900 leading-none">Impact Territorial</h3>
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">Mesure de la performance environnementale</p>
                                            </div>
                                            <span className="px-5 py-2.5 bg-emerald-50/70 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-emerald-100 shadow-sm"><img src="/images/police_verte_logo.png" alt="Police Verte Logo" className="w-3.5 h-3.5 object-contain" />Performance ÉCO</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="space-y-6">
                                                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">CO2 Évité (Territoire)</p>
                                                <p className="text-6xl font-black italic tracking-tighter text-emerald-500">{(collectedWastes * 1.5).toFixed(1)} <span className="text-2xl text-zinc-300">kg</span></p>
                                                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                                    <div className="w-8 h-8 bg-zinc-800 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm"><Zap size={14} /></div>
                                                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tight leading-none">Équivalent à {Math.round(collectedWastes * 0.05)} arbres plantés ce mois-ci.</p>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Volume Recyclé Total</p>
                                                <p className="text-6xl font-black italic tracking-tighter text-zinc-900">{wastes.reduce((acc, w) => acc + (w.status === 'collected' ? (w.final_weight || w.estimated_weight || 0) : 0), 0)} <span className="text-2xl text-zinc-300">kg</span></p>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-400"><span>Objectif Mensuel</span><span>65%</span></div>
                                                    <div className="w-full h-2.5 bg-zinc-550 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-zinc-900 w-[65%] rounded-full" /></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/80 backdrop-blur-md p-12 rounded-[4rem] text-zinc-900 flex flex-col justify-between group relative overflow-hidden shadow-lg shadow-slate-100 border border-slate-200/50 min-h-[450px]">
                                        <TrendingUp className="absolute top-10 right-10 text-zinc-900/[0.03] w-48 h-48 -rotate-12 transition-transform group-hover:scale-110" />
                                        <div>
                                            <div className="w-16 h-16 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mb-10"><BarChart3 size={28} className="text-emerald-500" /></div>
                                            <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4 leading-none">Rapport <br/> Décisionnel</h3>
                                            <p className="text-zinc-555 text-[11px] font-bold uppercase tracking-widest leading-loose mb-10 opacity-60">Accédez à l'analyse complète multicritères et prévisionnelle de votre commune.</p>
                                        </div>
                                        <button onClick={() => {
                                            const rapportUrl = targetMairieId ? `/city-os/rapports?id=${targetMairieId}` : "/city-os/rapports";
                                            router.push(rapportUrl);
                                        }} className="w-full py-6 bg-emerald-500 text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-4 group-hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20">CONSULTER LE RAPPORT GLOBAL<ArrowUpRight size={18} /></button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'police' && (
                            <motion.div key="police" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="space-y-10">
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                    <div className="lg:col-span-3 h-[600px] rounded-[4rem] overflow-hidden border border-slate-200/55 bg-white relative shadow-md">
                                        <div className="absolute inset-0 z-0">
                                            <RadarErrorBoundary>
                                                <MapComponent isMairie={true} targetCity={mairieCity} mairieId={targetMairieId || undefined} />
                                            </RadarErrorBoundary>
                                        </div>
                                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                            <div className="w-[500px] h-[500px] border border-red-500/10 rounded-full animate-ping opacity-20" />
                                            <div className="absolute w-[300px] h-[300px] border border-red-500/20 rounded-full animate-pulse opacity-20" />
                                        </div>
                                        
                                        {/* Infraction Markers */}
                                        <div className="absolute inset-0 z-20 pointer-events-none p-20">
                                            {infractions.filter(i => i.status === 'open').slice(0, 5).map((inf, idx) => (
                                                <div key={inf.id} className="absolute animate-bounce" style={{ top: `${20 + idx * 15}%`, left: `${30 + idx * 10}%` }}>
                                                    <div className="p-3 bg-red-600 text-white rounded-2xl shadow-xl flex items-center gap-2">
                                                        <AlertTriangle size={14} className="animate-pulse" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">{inf.type}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="absolute bottom-10 left-10 z-30 p-8 bg-white/85 backdrop-blur-md text-zinc-900 rounded-[2.5rem] border border-slate-200/40 shadow-xl space-y-4 max-w-[320px]">
                                            <h4 className="text-xl font-black italic uppercase tracking-tighter leading-none border-b border-gray-100 pb-4">STATUT RADAR</h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-zinc-400 uppercase">Alertes Actives</span><span className="text-sm font-black text-red-500">{infractionStats?.open || 0}</span></div>
                                                <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-zinc-400 uppercase">Points Critiques</span><span className="text-sm font-black text-amber-500">{infractionStats?.critical || 0}</span></div>
                                                <div className="flex justify-between items-center pt-2 border-t border-gray-100"><span className="text-[9px] font-bold text-emerald-500 uppercase">Système IA</span><span className="text-[9px] font-black bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-400">NOMINAL</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 overflow-y-auto pr-2 no-scrollbar">
                                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] pl-4">INCIDENTS RÉCENTS</h3>
                                        {infractions.map((inf) => (
                                            <button 
                                                key={inf.id} 
                                                onClick={() => { setSelectedInfraction(inf); setIsInfractionDetailModalOpen(true); }}
                                                className="w-full text-left p-6 bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-[2.5rem] hover:border-red-500/30 transition-all group relative overflow-hidden shadow-md shadow-slate-50"
                                            >
                                                <div className={cn(
                                                    "absolute top-0 right-0 p-3 text-[7px] font-black uppercase tracking-widest rounded-bl-xl",
                                                    inf.status === 'open' ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                                                )}>
                                                    {inf.status}
                                                </div>
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-zinc-450 group-hover:text-red-500 transition-colors">
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
                                    <div className="p-10 bg-white border border-gray-100 rounded-[3.5rem] text-zinc-900 flex flex-col justify-between group overflow-hidden relative min-h-[350px] shadow-sm">
                                        <Megaphone className="absolute -right-8 -top-8 text-zinc-900/5 w-48 h-48 -rotate-12 transition-transform group-hover:rotate-0" />
                                        <div className="relative z-10">
                                            <h3 className="text-3xl font-black italic tracking-tighter mb-4 leading-none text-red-500">ALERTE <br /> GÉNÉRALE</h3>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] leading-relaxed mb-10 opacity-70">Diffuser un ordre de salubrité immédiat à tous les collecteurs du district.</p>
                                        </div>
                                        <button onClick={() => showToast("Signal d'urgence diffusé à toutes les unités !", "success")} className="w-full py-6 bg-gray-50 border border-gray-200 text-zinc-800 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm">LANCER LE SIGNAL D'URGENCE</button>
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
                                            <div key={agent.id} className="p-6 bg-white border border-gray-100 rounded-[2.5rem] hover:border-emerald-500/30 transition-all flex items-center justify-between shadow-md">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center overflow-hidden p-3">
                                                        <img src="/images/police_verte_logo.png" alt="Police Verte" className="w-full h-full object-contain" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black italic uppercase text-zinc-900">{agent.full_name}</p>
                                                        <p className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest">{agent.zones?.name || "Patrouille Libre"}</p>
                                                    </div>
                                                </div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
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

            <Modal isOpen={isAddTenderModalOpen} onClose={() => setIsAddTenderModalOpen(false)} title="⚖️ LANCER UNE MISE EN CONCURRENCE">
                <form onSubmit={handleCreateTender} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="tenderZone" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Zone Stratégique</label>
                        <select id="tenderZone" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-black uppercase outline-none text-zinc-900" value={newTender.zone_id} onChange={(e) => setNewTender({...newTender, zone_id: e.target.value})}>
                            <option value="">Sélectionner une zone...</option>
                            {zones.filter(z => z.status === 'available').map(z => (<option key={z.id} value={z.id} className="text-zinc-900">{z.name}</option>))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="tenderTitle" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Titre du Marché</label>
                        <input id="tenderTitle" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-black uppercase outline-none text-zinc-900 placeholder:text-zinc-300" placeholder="Titre du Marché" value={newTender.title} onChange={(e) => setNewTender({...newTender, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="tenderDesc" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Description technique</label>
                        <textarea id="tenderDesc" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-medium min-h-[100px] outline-none text-zinc-900 placeholder:text-zinc-300" placeholder="Détails techniques..." value={newTender.description} onChange={(e) => setNewTender({...newTender, description: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label htmlFor="tenderBudget" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Budget (CFA)</label><input id="tenderBudget" type="number" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-black outline-none text-zinc-900" placeholder="CFA" value={newTender.budget_estimate} onChange={(e) => setNewTender({...newTender, budget_estimate: Number.parseInt(e.target.value, 10)})} /></div>
                        <div className="space-y-2"><label htmlFor="tenderEndDate" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Clôture</label><input id="tenderEndDate" type="date" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-black outline-none text-zinc-900" value={newTender.end_date} onChange={(e) => setNewTender({...newTender, end_date: e.target.value})} /></div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-5 bg-emerald-500 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.01] transition-all disabled:opacity-50">
                        {loading ? "Diffusion..." : "DIFFUSER L'APPEL D'OFFRES"}
                    </button>
                </form>
            </Modal>

             <Modal isOpen={isAddZoneModalOpen} onClose={() => setIsAddZoneModalOpen(false)} title="🏛️ CENTRE DE COMMANDE : NOUVELLE ZONE">
                 <form onSubmit={handleAddZoneSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="zoneName" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Nom de la Zone</label>
                        <input id="zoneName" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-black uppercase outline-none text-zinc-900 placeholder:text-zinc-300" placeholder="Ex: Zone Nord..." value={newZone.name} onChange={(e) => setNewZone({...newZone, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="zoneDistrict" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">District *</label>
                            <select id="zoneDistrict" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black uppercase outline-none text-zinc-900" value={newZone.district} onChange={(e) => setNewZone({...newZone, district: e.target.value})}>
                                <option value="">Choisir un district...</option>
                                <option value="District Autonome d'Abidjan">District Autonome d'Abidjan</option>
                                <option value="District Autonome de Yamoussoukro">District Autonome de Yamoussoukro</option>
                                <option value="District des Lacs">District des Lacs</option>
                                <option value="District de la Vallée du Bandama">District de la Vallée du Bandama</option>
                                <option value="District du Bas-Sassandra">District du Bas-Sassandra</option>
                                <option value="Autre District">Autre District</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="zoneCommune" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Commune *</label>
                            <select id="zoneCommune" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black uppercase outline-none text-zinc-900" value={newZone.commune} onChange={(e) => setNewZone({...newZone, commune: e.target.value})}>
                                <option value="">Choisir la commune...</option>
                                <option value="Cocody">Cocody</option>
                                <option value="Yopougon">Yopougon</option>
                                <option value="Plateau">Plateau</option>
                                <option value="Treichville">Treichville</option>
                                <option value="Marcory">Marcory</option>
                                <option value="Koumassi">Koumassi</option>
                                <option value="Abobo">Abobo</option>
                                <option value="Adjamé">Adjamé</option>
                                <option value="Port-Bouët">Port-Bouët</option>
                                <option value="Bingerville">Bingerville</option>
                                <option value="Songon">Songon</option>
                                <option value="Autre Commune">Autre Commune</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="zoneDesc" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Description technique</label>
                        <textarea id="zoneDesc" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-medium min-h-[80px] outline-none text-zinc-900 placeholder:text-zinc-300" placeholder="Description de la zone..." value={newZone.description} onChange={(e) => setNewZone({...newZone, description: e.target.value})} />
                    </div>
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Attribution Directe</span>
                            <button type="button" onClick={() => setIsAttributingDirectly(!isAttributingDirectly)} className={cn("w-14 h-8 rounded-full p-1 transition-all shadow-inner", isAttributingDirectly ? "bg-emerald-500" : "bg-zinc-200")}>
                                <div className={cn("bg-white w-6 h-6 rounded-full shadow-md transition-all", isAttributingDirectly ? "ml-6" : "ml-0")} />
                            </button>
                        </div>
                        {isAttributingDirectly && (
                            <div className="space-y-4 pt-4 border-t border-emerald-100 animate-in fade-in slide-in-from-top-2">
                                <div className="flex bg-zinc-100/50 p-1 rounded-xl border border-zinc-200/50">
                                    <button
                                        type="button"
                                        onClick={() => { setPartnerType("entreprise"); setSelectedOrgId(""); }}
                                        className={cn(
                                            "flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                                            partnerType === "entreprise" ? "bg-white text-emerald-700 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                                        )}
                                    >
                                        Entreprise Privée
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setPartnerType("organisation"); setSelectedOrgId(""); }}
                                        className={cn(
                                            "flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                                            partnerType === "organisation" ? "bg-white text-emerald-700 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                                        )}
                                    >
                                        Organisation / ONG
                                    </button>
                                </div>
                                <select id="directOrg" className="w-full px-6 py-4 bg-white border border-emerald-200 rounded-2xl text-[10px] font-black uppercase outline-none text-zinc-900" value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} required={isAttributingDirectly}>
                                    <option value="">{partnerType === 'entreprise' ? "Choisir une entreprise privée..." : "Choisir une organisation / ONG..."}</option>
                                    {organizations
                                        .filter(org => partnerType === 'entreprise' 
                                            ? (org.role === 'entreprise' || org.role === 'collecteur') 
                                            : org.role === 'organisation_admin'
                                        )
                                        .map(org => (<option key={org.id} value={org.id}>{org.full_name} ({org.performanceScore || '5.0'}/5)</option>))
                                    }
                                </select>
                                <select id="directDuration" className="w-full px-6 py-4 bg-white border border-emerald-200 rounded-2xl text-[10px] font-black uppercase outline-none text-zinc-900" value={concessionDuration} onChange={(e) => setConcessionDuration(Number.parseInt(e.target.value, 10))}>
                                    <option value={6}>Contrat : 6 mois</option>
                                    <option value={12}>Contrat : 12 mois</option>
                                    <option value={24}>Contrat : 24 mois</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <button type="submit" disabled={loading || !newZone.name || !newZone.district || !newZone.commune} className="w-full py-7 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all">
                        {loading ? "Déploiement..." : "VALIDER LA CONCESSION"}
                    </button>
                 </form>
            </Modal>

            <Modal isOpen={isSanctionModalOpen} onClose={() => setIsSanctionModalOpen(false)} title="⚖️ CENTRE DE SANCTION">
                <form onSubmit={handleIssueSanctionSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="sanctionOrg" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Organisation Cible</label>
                        <select 
                            id="sanctionOrg"
                            required 
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-black outline-none text-zinc-900"
                            value={sanctionForm.orgId}
                            onChange={(e) => setSanctionForm({...sanctionForm, orgId: e.target.value})}
                        >
                            <option value="">Sélectionner une entreprise ou organisation...</option>
                            {organizations.map(org => (
                                <option key={org.id} value={org.id}>
                                    {org.full_name} — {org.role === 'organisation_admin' ? 'ORGANISATION / ONG' : 'ENTREPRISE'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="sanctionType" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Type de Litige</label>
                            <select 
                                id="sanctionType"
                                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black outline-none text-zinc-900"
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
                            <label htmlFor="sanctionSeverity" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Gravité</label>
                            <select 
                                id="sanctionSeverity"
                                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black outline-none text-zinc-900"
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
                        <label htmlFor="sanctionAmount" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Pénalité (CFA)</label>
                        <input 
                            id="sanctionAmount"
                            type="number"
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-black outline-none text-zinc-900"
                            placeholder="Montant en CFA"
                            value={sanctionForm.amount}
                            onChange={(e) => setSanctionForm({...sanctionForm, amount: Number.parseInt(e.target.value, 10)})}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="sanctionJustification" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Description / Justification</label>
                        <textarea 
                            id="sanctionJustification"
                            required
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-medium min-h-[100px] outline-none text-zinc-900 placeholder:text-zinc-300"
                            placeholder="Détails du manquement..."
                            value={sanctionForm.description}
                            onChange={(e) => setSanctionForm({...sanctionForm, description: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !sanctionForm.orgId}
                        className="w-full py-5 bg-red-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 disabled:opacity-50 hover:scale-[1.01] transition-all"
                    >
                        {loading ? "Traitement..." : "APPLIQUER LA SANCTION"}
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
                        <div className="p-10 bg-gray-50 border border-gray-200 rounded-[3rem] shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
                            <p className="text-[10px] font-black uppercase text-zinc-400 mb-4 tracking-[0.2em] relative z-10">Actes Administratifs</p>
                            <p className="text-5xl font-black italic tracking-tighter text-zinc-900 relative z-10">
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

                    <button onClick={() => globalThis.print()} className="w-full py-7 bg-gray-100 text-zinc-800 border border-gray-200 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-sm flex items-center justify-center gap-4 hover:bg-gray-200 transition-all">
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
                                <div className="p-8 bg-gray-50 border border-gray-150 rounded-[3rem] text-zinc-900 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <h4 className="text-[9px] font-black uppercase text-zinc-400 mb-2 tracking-widest">Type d'Infraction</h4>
                                    <p className="text-3xl font-black italic uppercase tracking-tighter text-red-500 leading-none">{selectedInfraction.type}</p>
                                    <div className="mt-8 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/5 rounded-lg"><MapPin size={12} className="text-zinc-400" /></div>
                                            <p className="text-[10px] font-bold uppercase text-zinc-650">{selectedInfraction.zones?.name || "Coordonnées GPS directes"}</p>
                                        </div>
                                        {selectedInfraction.manual_address && (
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-500/10 rounded-lg"><Navigation size={12} className="text-emerald-500" /></div>
                                                <p className="text-[10px] font-black uppercase text-emerald-400 italic">Précision : {selectedInfraction.manual_address}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest ml-4">Preuve Capturée</h4>
                                    <div className="aspect-video w-full bg-zinc-100 rounded-[2.5rem] border border-zinc-200 overflow-hidden flex items-center justify-center italic text-[10px] text-zinc-400">
                                        {selectedInfraction.images?.[0] ? <img src={selectedInfraction.images[0]} alt="Preuve terrain" className="w-full h-full object-cover" /> : "Image Terrain Indisponible"}
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
                                                onChange={(e) => setPenaltyAmount(Number.parseInt(e.target.value, 10))}
                                            />
                                        </div>
                                        
                                        <button 
                                            onClick={handleConvertInfractionToSanction}
                                            disabled={loading || !selectedInfraction.responsible_org_id || selectedInfraction.status === 'sanctioned'}
                                            className="w-full py-5 bg-red-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/30 flex items-center justify-center gap-3 disabled:grayscale"
                                        >
                                            <Gavel size={16} /> ÉMETTRE LA SANCTION FINANCIÈRE
                                        </button>

                                        <button 
                                            onClick={handleResolveInfraction}
                                            disabled={loading || selectedInfraction.status === 'resolved'}
                                            className="w-full py-5 bg-gray-100 border border-gray-200 text-zinc-800 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-gray-200"
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
                <form onSubmit={handleRecruitAgent} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="agentName" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Nom Complet de l'Officier</label>
                        <input id="agentName" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-black outline-none text-zinc-900 placeholder:text-zinc-300 focus:border-emerald-500/50 transition-all" value={newAgent.fullName} onChange={(e) => setNewAgent({...newAgent, fullName: e.target.value})} placeholder="Ex: Florent Domigo..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="agentEmail" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Email Professionnel</label>
                            <input id="agentEmail" type="email" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-black outline-none text-zinc-900 placeholder:text-zinc-300 focus:border-emerald-500/50 transition-all" value={newAgent.email} onChange={(e) => setNewAgent({...newAgent, email: e.target.value})} placeholder="nom@citicline.com" />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="agentPass" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Mot de Passe Initial</label>
                            <input id="agentPass" type="password" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-black outline-none text-zinc-900 focus:border-emerald-500/50 transition-all" value={newAgent.password} onChange={(e) => setNewAgent({...newAgent, password: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="agentPhone" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Numéro de Téléphone</label>
                            <input id="agentPhone" required className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-black outline-none text-zinc-900 focus:border-emerald-500/50 transition-all" value={newAgent.phone} onChange={(e) => setNewAgent({...newAgent, phone: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="agentZone" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Zone d'Affectation</label>
                            <select id="agentZone" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black uppercase outline-none text-zinc-900 focus:border-emerald-500/50 transition-all appearance-none" value={newAgent.zoneId} onChange={(e) => setNewAgent({...newAgent, zoneId: e.target.value})}>
                                <option value="">Choisir une zone...</option>
                                {zones.map(z => (<option key={z.id} value={z.id} className="text-zinc-900">{z.name}</option>))}
                            </select>
                        </div>
                    </div>
                    <button type="submit" disabled={loading || !newAgent.fullName || !newAgent.email} className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50">
                        {loading ? "Génération du badge..." : "CRÉER LE COMPTE AGENT"}
                    </button>
                    <p className="text-[8px] font-bold text-center text-zinc-400 uppercase tracking-[0.2em] italic">L'agent pourra se connecter sur l'app mobile immédiatement.</p>
                </form>
            </Modal>

            <Modal isOpen={isFiscalModalOpen} onClose={() => setIsFiscalModalOpen(false)} title="⚖️ CONFIGURATION DE LA FISCALITÉ URBAINE">
                <form onSubmit={handleSaveFiscalConfig} className="space-y-8">
                    <div className="p-8 bg-zinc-50 border border-zinc-100 rounded-[3rem] space-y-6 shadow-inner">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center text-emerald-500 shadow-sm">
                                <DollarSign size={28} />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-zinc-900 uppercase tracking-widest leading-none">Taux de Prélèvement</h4>
                                <p className="text-[10px] font-bold text-zinc-400 mt-2">Ajustez les pourcentages applicables sur chaque collecte.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="commission-rate" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Commission CITICLINE (%)</label>
                                <input 
                                    id="commission-rate"
                                    type="number" 
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    required 
                                    className="w-full px-6 py-4 bg-white border border-zinc-100 rounded-2xl text-sm font-black outline-none text-zinc-900 focus:border-emerald-500/50 transition-all" 
                                    value={fiscalRates.commissionRate * 100} 
                                    onChange={(e) => setFiscalRates({...fiscalRates, commissionRate: Number.parseFloat(e.target.value) / 100})} 
                                />
                                <p className="text-[8px] text-zinc-400 italic px-4 uppercase tracking-widest">Taux standard : 10%</p>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="eco-tax-rate" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Éco-Taxe Municipale (%)</label>
                                <input 
                                    id="eco-tax-rate"
                                    type="number" 
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    required 
                                    className="w-full px-6 py-4 bg-white border border-zinc-100 rounded-2xl text-sm font-black outline-none text-zinc-900 focus:border-emerald-500/50 transition-all" 
                                    value={fiscalRates.ecoTaxRate * 100} 
                                    onChange={(e) => setFiscalRates({...fiscalRates, ecoTaxRate: Number.parseFloat(e.target.value) / 100})} 
                                />
                                <p className="text-[8px] text-zinc-400 italic px-4 uppercase tracking-widest">Taux standard : 2%</p>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-7 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                        {loading ? "APPLICATION..." : "APPLIQUER LA NOUVELLE FISCALITÉ"}
                    </button>
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

// --- Error Boundary for the Map ---
class RadarErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("Radar Error Boundary caught:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-[70vh] rounded-[3rem] bg-zinc-900 border border-red-500/20 flex flex-col items-center justify-center gap-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Erreur d'initialisation du moteur radar</p>
                    <button 
                        onClick={() => this.setState({ hasError: false })}
                        className="px-6 py-2 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                    >
                        Réinitialiser le radar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
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
