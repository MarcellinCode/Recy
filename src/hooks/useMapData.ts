"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getMunicipalityGeo, type MunicipalityGeo } from "@/lib/geoIntelligence";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface WasteMarker {
    id: string;
    latitude: number;
    longitude: number;
    status: string;
    waste_types: { name: string; emoji: string; price_per_kg: number };
    estimated_weight: number;
    location: string;
    images?: string[];
    created_at?: string;
    seller?: { city?: string };
    assigned_agent_id?: string;
    mission_type?: string;
    assigned_agent?: { id: string; full_name: string };
}

export interface AgentMarker {
    id: string;
    agent_id: string;
    latitude: number;
    longitude: number;
    profiles?: { full_name: string };
    vehicles?: { name: string; type: string };
}

export interface ZoneMarker {
    id: string;
    name: string;
    status: string;
    latitude?: number;
    longitude?: number;
    boundaries?: any;
    concessions?: { profiles?: { full_name: string } }[];
}

export interface MapDataState {
    wastes: WasteMarker[];
    agents: AgentMarker[];
    zones: ZoneMarker[];
    infractions: any[];
    loading: boolean;
    errors: Record<string, string>; // visibilité des erreurs par requête
    refetch: () => void;
}

interface UseMapDataOptions {
    supabase: any;
    isMairie?: boolean;
    targetCity?: string;
    mairieId?: string;
    organizationId?: string;
}

// ─────────────────────────────────────────────
// safeQuery — isole chaque requête Supabase
// Retourne { data: fallback } en cas d'erreur
// sans jamais rejeter la promesse parente.
// ─────────────────────────────────────────────
async function safeQuery<T = any>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    label: string,
    fallback: T,
    errors: Record<string, string>
): Promise<T> {
    try {
        const res = await queryFn();
        if (res?.error) {
            console.warn(`[useMapData] ${label}:`, res.error.message || res.error);
            errors[label] = res.error.message || "Erreur inconnue";
            return fallback;
        }
        return (res?.data ?? fallback) as T;
    } catch (e: any) {
        console.error(`[useMapData] Exception ${label}:`, e);
        errors[label] = e?.message || "Exception inattendue";
        return fallback;
    }
}

// ─────────────────────────────────────────────
// Helpers géographiques
// ─────────────────────────────────────────────
export function isPointInMunicipality(lat: any, lng: any, geo: MunicipalityGeo): boolean {
    if (!geo.boundaries || geo.boundaries.length === 0) return true;
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (isNaN(nLat) || isNaN(nLng)) return false;
    const lons = geo.boundaries.map((b: any) => b[0]);
    const lats = geo.boundaries.map((b: any) => b[1]);
    return nLat >= Math.min(...lats) && nLat <= Math.max(...lats) &&
           nLng >= Math.min(...lons) && nLng <= Math.max(...lons);
}

export function isPointInZone(lat: any, lng: any, zone: any): boolean {
    if (!zone.boundaries?.geometry?.coordinates) return true;
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (isNaN(nLat) || isNaN(nLng)) return false;
    const coords = zone.boundaries.geometry.type === "MultiPolygon"
        ? zone.boundaries.geometry.coordinates.flatMap((poly: any) => poly[0])
        : zone.boundaries.geometry.coordinates[0];
    const lons = coords.map((c: any) => c[0]);
    const lats = coords.map((c: any) => c[1]);
    return nLat >= Math.min(...lats) && nLat <= Math.max(...lats) &&
           nLng >= Math.min(...lons) && nLng <= Math.max(...lons);
}

// ─────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────
export function useMapData({
    supabase,
    isMairie = false,
    targetCity,
    mairieId,
    organizationId,
}: UseMapDataOptions): MapDataState {
    const [wastes, setWastes] = useState<WasteMarker[]>([]);
    const [agents, setAgents] = useState<AgentMarker[]>([]);
    const [zones, setZones] = useState<ZoneMarker[]>([]);
    const [infractions, setInfractions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const isMounted = useRef(true);

    const fetchData = useCallback(async (isFirstLoad = false) => {
        if (isFirstLoad && isMounted.current) setLoading(true);

        const queryErrors: Record<string, string> = {};
        try {
            const cityGeo = targetCity ? getMunicipalityGeo(targetCity) : null;

            // ── Niveau 1 : toutes les requêtes indépendantes en parallèle ──
            // Chacune est isolée — une erreur n'affecte pas les autres.
            const [
                zonesData,
                concessionsData,
                allProfiles,
                wastesRaw,
                wasteTypesData,
                infractionsRaw,
                trackingData,
            ] = await Promise.all([
                safeQuery<any[]>(() => supabase.from("zones").select("*"), "zones", [], queryErrors),
                safeQuery<any[]>(() => supabase.from("concessions").select("*"), "concessions", [], queryErrors),
                safeQuery<any[]>(() => supabase.from("profiles").select("id, full_name, city"), "profiles", [], queryErrors),
                safeQuery<any[]>(
                    () => supabase.from("wastes").select("*")
                        .in("status", ["published", "reserved"])
                        .not("latitude", "is", null)
                        .not("longitude", "is", null),
                    "wastes", [], queryErrors
                ),
                safeQuery<any[]>(() => supabase.from("waste_types").select("*"), "waste_types", [], queryErrors),
                (isMairie || organizationId)
                    ? safeQuery<any[]>(
                        () => supabase.from("environmental_infractions").select("*")
                            .not("latitude", "is", null)
                            .not("longitude", "is", null),
                        "infractions", [], queryErrors
                      )
                    : Promise.resolve([]),
                // agent_live_positions est la requête la plus susceptible d'échouer (RLS)
                // Elle est isolée : son échec n'empêche plus l'affichage des déchets.
                safeQuery<any[]>(
                    () => supabase.from("agent_live_positions").select("*")
                        .order("timestamp", { ascending: false })
                        .limit(200),
                    "agent_live_positions", [], queryErrors
                ),
            ]);

            // ── Traitement des zones ──
            let fetchedZones: ZoneMarker[] = [];
            if (isMairie) {
                let filtered = zonesData;
                if (mairieId) {
                    filtered = zonesData.filter((z: any) => z.organization_id === mairieId);
                } else if (targetCity) {
                    const cityClean = targetCity.replace(/Mairie de |Commune de |Ville de /gi, "").trim().toLowerCase();
                    filtered = zonesData.filter((z: any) => z.city?.toLowerCase().includes(cityClean));
                }
                fetchedZones = filtered.map((zone: any) => ({
                    ...zone,
                    concessions: concessionsData
                        .filter((c: any) => c.zone_id === zone.id)
                        .map((c: any) => ({
                            ...c,
                            profiles: allProfiles.find((p: any) => p.id === c.organization_id),
                        })),
                }));
            } else if (organizationId) {
                const active = concessionsData.filter(
                    (c: any) => c.organization_id === organizationId && c.status === "active"
                );
                fetchedZones = active
                    .map((c: any) => {
                        const zone = zonesData.find((z: any) => z.id === c.zone_id);
                        return zone ? { ...zone, concessions: [c] } : null;
                    })
                    .filter(Boolean) as ZoneMarker[];
            }

            if (isMounted.current) setZones(fetchedZones);

            // ── Traitement des déchets ──
            const enrichedWastes = wastesRaw.map((w: any) => ({
                ...w,
                waste_types: wasteTypesData.find((t: any) => t.id === w.waste_type_id) ||
                    { name: "Déchet", emoji: "🗑️", price_per_kg: 0 },
                seller: allProfiles.find((p: any) => p.id === w.seller_id),
                assigned_agent: allProfiles.find((p: any) => p.id === w.assigned_agent_id),
            }));

            let finalWastes = enrichedWastes;
            if (isMairie && targetCity && cityGeo) {
                const cityClean = targetCity.replace(/Mairie de |Commune de |Ville de /gi, "").trim().toLowerCase();
                finalWastes = enrichedWastes.filter((w: any) => {
                    if (w.latitude && w.longitude) return isPointInMunicipality(w.latitude, w.longitude, cityGeo);
                    const sellerCity = w.seller?.city?.toLowerCase() || "";
                    const locationLower = w.location?.toLowerCase() || "";
                    return sellerCity.includes(cityClean) || locationLower.includes(cityClean);
                });
            } else if (organizationId && fetchedZones.length > 0) {
                finalWastes = enrichedWastes.filter((w: any) =>
                    w.latitude && w.longitude &&
                    fetchedZones.some((z) => isPointInZone(w.latitude, w.longitude, z))
                );
            }

            if (isMounted.current) {
                setWastes(finalWastes.filter((w: any) => w.latitude && w.longitude));
            }

            // ── Traitement des infractions ──
            // Utilise reported_by (nom correct dans Supabase, pas reporter_id)
            if (isMairie || organizationId) {
                const enrichedInfractions = infractionsRaw.map((i: any) => ({
                    ...i,
                    profiles: allProfiles.find((p: any) => p.id === i.reported_by),
                    zones: zonesData.find((z: any) => z.id === i.zone_id),
                }));

                let finalInfractions = enrichedInfractions;
                if (isMairie && targetCity && cityGeo) {
                    const cityClean = targetCity.replace(/Mairie de |Commune de |Ville de /gi, "").trim().toLowerCase();
                    finalInfractions = enrichedInfractions.filter((i: any) => {
                        if (i.latitude && i.longitude) return isPointInMunicipality(i.latitude, i.longitude, cityGeo);
                        const zoneCity = i.zones?.city?.toLowerCase() || "";
                        const descLower = i.description?.toLowerCase() || "";
                        const typeLower = i.type?.toLowerCase() || "";
                        return !zoneCity || zoneCity.includes(cityClean) ||
                            descLower.includes(cityClean) ||
                            typeLower.includes(cityClean);
                    });
                } else if (organizationId && fetchedZones.length > 0) {
                    finalInfractions = enrichedInfractions.filter((i: any) =>
                        i.latitude && i.longitude &&
                        fetchedZones.some((z) => isPointInZone(i.latitude, i.longitude, z))
                    );
                } else if (!isMairie) {
                    finalInfractions = [];
                }

                if (isMounted.current) setInfractions(finalInfractions);
            }

            // ── Traitement des agents (niveau 2 — dépend de trackingData) ──
            if (trackingData.length > 0) {
                const latestPositions: Record<string, any> = trackingData.reduce((acc: any, curr: any) => {
                    if (!acc[curr.agent_id]) acc[curr.agent_id] = curr;
                    return acc;
                }, {});

                const agentIds = Object.keys(latestPositions);
                const vehicleIds = Object.values(latestPositions)
                    .map((p: any) => p.vehicle_id)
                    .filter(Boolean);

                // Ces deux requêtes secondaires sont aussi isolées
                const [agentsProfiles, vehiclesData] = await Promise.all([
                    agentIds.length > 0
                        ? safeQuery(
                            () => supabase.from("profiles").select("id, full_name").in("id", agentIds),
                            "agent_profiles", [], queryErrors
                          )
                        : Promise.resolve([]),
                    vehicleIds.length > 0
                        ? safeQuery(
                            () => supabase.from("vehicles").select("id, name, type").in("id", vehicleIds),
                            "vehicles", [], queryErrors
                          )
                        : Promise.resolve([]),
                ]);

                const enrichedAgents = Object.values(latestPositions).map((pos: any) => ({
                    ...pos,
                    profiles: agentsProfiles.find((p: any) => p.id === pos.agent_id),
                    vehicles: vehiclesData.find((v: any) => v.id === pos.vehicle_id),
                }));

                let finalAgents = enrichedAgents;
                if (isMairie && targetCity && cityGeo) {
                    finalAgents = enrichedAgents.filter((a: any) =>
                        !a.latitude || !a.longitude || isPointInMunicipality(a.latitude, a.longitude, cityGeo)
                    );
                } else if (organizationId && fetchedZones.length > 0) {
                    finalAgents = enrichedAgents.filter((a: any) =>
                        a.latitude && a.longitude &&
                        fetchedZones.some((z) => isPointInZone(a.latitude, a.longitude, z))
                    );
                }

                if (isMounted.current) setAgents(finalAgents as AgentMarker[]);
            }
        } catch (globalErr) {
            console.error("[useMapData] Critical fetchData crash, forcing bypass:", globalErr);
        } finally {
            if (isMounted.current) {
                setErrors(queryErrors);
                if (isFirstLoad) setLoading(false);
            }
        }
    }, [supabase, isMairie, targetCity, mairieId, organizationId]);

    // Chargement initial + cleanup
    useEffect(() => {
        isMounted.current = true;
        fetchData(true);

        const channel = supabase.channel("map_tracking_changes")
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "agent_live_positions",
            }, () => {
                if (isMounted.current) fetchData(false);
            })
            .subscribe();

        return () => {
            isMounted.current = false;
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    return { wastes, agents, zones, infractions, loading, errors, refetch: () => fetchData(false) };
}
