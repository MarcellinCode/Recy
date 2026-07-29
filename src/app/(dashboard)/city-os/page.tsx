import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import CityOSClient from "./CityOSClient";

export const dynamic = "force-dynamic";

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

async function safeQuery(query: any, errorLabel: string, fallback: any = { data: null }) {
    try {
        const res = await query;
        if (res?.error) {
            console.error(`Error in ${errorLabel}:`, res.error);
            return fallback;
        }
        return res || fallback;
    } catch (e) {
        console.error(`Exception in ${errorLabel}:`, e);
        return fallback;
    }
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

    let wastesQuery = supabase.from('wastes').select('id, status, created_at, estimated_weight, final_weight, collector_id, profiles!seller_id!inner(city)');
    if (currentUserProfile?.role !== 'super_admin' || targetMairieId) {
        const cleanCity = mairieCity.replace(/Mairie de |Commune de |Ville de /gi, "").trim();
        wastesQuery = wastesQuery.ilike('profiles.city', `%${cleanCity}%`);
    }

    let bidsQuery = supabase.from('tender_bids').select('*, tenders!inner(mairie_id)');
    if (currentUserProfile?.role !== 'super_admin' || targetMairieId) {
        bidsQuery = bidsQuery.eq('tenders.mairie_id', mairieId);
    }

    // Parallel Stage 1 queries
    const [
        zonesRes,
        wastesRes,
        tendersRes,
        bidsRes,
        txRes,
        sanctionsRes,
        orgsResult,
        vehiclesRes
    ] = await Promise.all([
        safeQuery(zonesQuery, "zones"),
        safeQuery(wastesQuery, "wastes"),
        safeQuery(supabase.from('tenders').select('*').eq('mairie_id', mairieId), "tenders"),
        safeQuery(bidsQuery, "tender_bids"),
        safeQuery(supabase.from('transactions').select('*').eq('user_id', mairieId).order('created_at', { ascending: false }), "transactions"),
        safeQuery(supabase.from('sanctions').select('*, profiles(full_name)').order('created_at', { ascending: false }), "sanctions"),
        safeQuery(supabase.from('profiles').select('id, full_name, agent_count, role').in('role', ['producteur', 'organisation_admin', 'collecteur']), "profiles for concessions"),
        safeQuery(supabase.from('vehicles').select('*'), "vehicles"),
    ]);

    const zonesData = zonesRes?.data || [];
    const wastesData = wastesRes?.data || [];
    const tendersData = tendersRes?.data || [];
    const bidsData = bidsRes?.data || [];
    const txData = txRes?.data || [];
    const sanctionsData = sanctionsRes?.data || [];
    const vehiclesData = vehiclesRes?.data || [];

    // Stage 2: Concessions, infractions, and agents (which depend on zoneIds from zonesData)
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

    let agentsQuery = supabase.from('profiles').select('*').eq('role', 'agent_police_verte');
    if (currentUserProfile?.role !== 'super_admin' || targetMairieId) {
        if (zoneIds.length > 0) {
            agentsQuery = agentsQuery.in('zone_id', zoneIds);
        } else {
            agentsQuery = agentsQuery.eq('id', 'NO_DATA_PREVENT_FETCH');
        }
    }
    agentsQuery = agentsQuery.order('created_at', { ascending: false });

    const [concessionsRes, infractionsRes, agentsRes] = await Promise.all([
        safeQuery(concessionsQuery, "concessions"),
        safeQuery(infractionsQuery, "infractions"),
        safeQuery(agentsQuery, "agents")
    ]);

    const concessionsData = concessionsRes?.data || [];
    const infractionsData = infractionsRes?.data || [];
    const rawAgentsData = agentsRes?.data || [];

    // Stage 3: Fetch profiles based on concessions, and agent live positions based on agent IDs
    const profileIds = [...new Set([
        ...(concessionsData.map((c: any) => c.organization_id) || []),
        ...(concessionsData.map((c: any) => c.profiles?.id) || [])
    ].filter(Boolean))];

    let profilesData: any[] = [];
    let posData: any[] = [];
    const stage3Queries: Promise<any>[] = [];

    if (profileIds.length > 0) {
        stage3Queries.push(safeQuery(supabase.from('profiles').select('id, full_name, role').in('id', profileIds), "profiles for stage 3"));
    } else {
        stage3Queries.push(Promise.resolve({ data: [] }));
    }

    const agentIds = rawAgentsData.map((a: any) => a.id) || [];
    let posQuery = supabase.from('agent_live_positions').select('*');
    if (currentUserProfile?.role !== 'super_admin' || targetMairieId) {
        if (agentIds.length > 0) {
            posQuery = posQuery.in('agent_id', agentIds);
        } else {
            posQuery = posQuery.eq('id', 'NO_DATA_PREVENT_FETCH');
        }
    }
    stage3Queries.push(safeQuery(posQuery, "agent live positions"));

    const [profilesRes, posRes] = await Promise.all(stage3Queries);
    profilesData = profilesRes?.data || [];
    posData = posRes?.data || [];

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

    const agentsData = rawAgentsData.map((agent: any) => ({
        ...agent,
        zones: zonesData.find((z: any) => z.id === agent.zone_id)
    }));
    
    const computedStats = {
        total: infractionsData.length,
        open: infractionsData.filter((i: any) => i.status === 'open').length,
        critical: infractionsData.filter((i: any) => i.severity === 'critical').length,
        types: infractionsData.reduce((acc: any, i: any) => {
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

export default async function MairieManagementPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const targetMairieId = params.id || null;
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        redirect("/mairie/connexion");
    }

    // Récupérer le profil et le rôle
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role, city')
        .eq('id', user.id)
        .single();

    if (!currentUserProfile || (currentUserProfile.role !== 'mairie' && currentUserProfile.role !== 'super_admin')) {
        redirect("/mairie/connexion");
    }

    let mairieId = user.id;
    if (currentUserProfile.role === 'super_admin' && targetMairieId) {
        mairieId = targetMairieId;
    }

    const initialData = await fetchRawMairieData(supabase, currentUserProfile, targetMairieId, mairieId);

    return (
        <CityOSClient initialData={initialData} profile={currentUserProfile} />
    );
}
