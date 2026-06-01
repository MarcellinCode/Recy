"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { Truck, MapPin, Package, Navigation, Loader2, Zap, Gavel } from "lucide-react";
import { motion } from "framer-motion";
import MarkerClusterGroup from "react-leaflet-cluster";
import { cn } from "@/lib/utils";
import { dispatchEmergencyAgent } from "@/app/actions/mairie";
import { showToast } from "@/components/ui/toast";
import { getMunicipalityGeo, type MunicipalityGeo } from "@/lib/geoIntelligence";

// Custom interface for Waste markers
interface WasteMarker {
    id: string;
    latitude: number;
    longitude: number;
    status: string;
    waste_types: {
        name: string;
        emoji: string;
        price_per_kg: number;
    };
    estimated_weight: number;
    location: string;
    images?: string[];
    created_at?: string;
}

interface AgentMarker {
    id: string;
    agent_id: string;
    latitude: number;
    longitude: number;
    profiles?: { full_name: string };
    vehicles?: { name: string; type: string };
}

interface ZoneMarker {
    id: string;
    name: string;
    status: string;
    latitude?: number;
    longitude?: number;
    boundaries?: any;
    concessions?: {
        profiles?: { full_name: string }
    }[];
}

function getMainColor(isHotspot: boolean, color: string): string {
    if (isHotspot) {
        return "red-600";
    }
    if (color === "#22c55e") {
        return "primary";
    }
    return "amber-500";
}

function getWasteStatusText(isHotspot: boolean, status: string): string {
    if (isHotspot) {
        return "POINT NOIR (SLA >48h)";
    }
    if (status === "reserved") {
        return "Réservé";
    }
    return "Disponible";
}

function getDispatchButtonClass(status: string): string {
    if (status === 'reserved') {
        return 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed';
    }
    return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-500 hover:text-white hover:shadow-red-500/20';
}

// Custom Icon Creator
const createCustomIcon = (emoji: string, color: string = "#22c55e", isHotspot: boolean = false) => {
    const mainColor = getMainColor(isHotspot, color);
    const ringClass = isHotspot ? 'bg-red-600 opacity-60 animate-ping border-4 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.8)]' : `bg-${mainColor} opacity-20 animate-ping`;
    const iconBaseClass = isHotspot ? 'bg-red-50 dark:bg-black border-red-600 shadow-[0_0_20px_rgba(220,38,38,1)] text-2xl' : `bg-white dark:bg-zinc-900 border-${mainColor} shadow-xl text-xl`;

    return L.divIcon({
        html: `
            <div class="relative flex items-center justify-center translate-y-[-20px]">
                <div class="absolute w-12 h-12 rounded-full ${ringClass}"></div>
                <div class="relative w-10 h-10 rounded-full border-4 flex items-center justify-center hover:scale-110 transition-transform ${iconBaseClass}">
                    ${emoji}
                </div>
                ${isHotspot ? '<div class="absolute -top-2 -right-2 text-xs bg-red-600 text-white font-black px-1 rounded-full shadow-lg border border-white z-50">!</div>' : ''}
            </div>
        `,
        className: 'custom-div-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
};

const createVehicleIcon = (type: string, status: string = 'active') => {
    const colorClass = status === 'in_maintenance' ? 'amber-500' : 'emerald-500';
    return L.divIcon({
        html: `
            <div class="relative flex items-center justify-center">
                <div class="absolute w-10 h-10 bg-${colorClass} opacity-20 animate-pulse rounded-2xl"></div>
                <div class="relative w-8 h-8 bg-white dark:bg-zinc-900 border-2 border-${colorClass} rounded-xl flex items-center justify-center shadow-xl text-${colorClass}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 17h4V5H2v12h3m1 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M14 9h5l3 3v5h-3"/>
                    </svg>
                </div>
            </div>
        `,
        className: 'vehicle-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};

// User Location Marker Component
function LocationMarker() {
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const map = useMap();

    useEffect(() => {
        map.locate().on("locationfound", function (e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        });
    }, [map]);

    const userIcon = L.divIcon({
        html: `
            <div class="relative flex items-center justify-center">
                <div class="absolute w-12 h-12 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                <div class="absolute w-8 h-8 bg-blue-500 rounded-full opacity-40 animate-pulse"></div>
                <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg z-10"></div>
            </div>
        `,
        className: 'user-location-icon',
    });

    return position === null ? null : (
        <Marker position={position} icon={userIcon}>
            <Popup>Vous êtes ici</Popup>
        </Marker>
    );
}

// Component to automatically adjust map bounds based on markers
function MapAdjuster({ bounds }: Readonly<{ bounds: L.LatLngBounds | null }>) {
    const map = useMap();
    useEffect(() => {
        if (bounds?.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [bounds, map]);
    return null;
}

function RadarScanner() {
    return (
        <div className="absolute inset-0 pointer-events-none z-[400] overflow-hidden rounded-[3rem]">
            {/* Spinning Line */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 left-1/2 w-[200%] h-[150px] bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent -translate-x-1/2 -translate-y-1/2 origin-center"
                style={{ clipPath: 'polygon(50% 50%, 100% 45%, 100% 55%)' }}
            />
            
            {/* Pulsing Grid Background Layer (Subtle) */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-30" />
            
            {/* Scanning Ring */}
            <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 w-96 h-96 border border-emerald-500/20 rounded-full -translate-x-1/2 -translate-y-1/2"
            />

            {/* Corners targeting UI */}
            <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-emerald-500/20 rounded-tl-2xl" />
            <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-emerald-500/20 rounded-tr-2xl" />
            <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-emerald-500/20 rounded-bl-2xl" />
            <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-emerald-500/20 rounded-br-2xl" />
            
            {/* Fixed crosshair in center (subtle) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center opacity-20">
                <div className="w-10 h-[1px] bg-emerald-500"></div>
                <div className="h-10 w-[1px] bg-emerald-500 absolute"></div>
            </div>
        </div>
    );
}

function isPointInMunicipality(lat: number, lng: number, geo: MunicipalityGeo): boolean {
    if (!geo.boundaries || geo.boundaries.length === 0) return true;
    const lons = geo.boundaries.map(b => b[0]);
    const lats = geo.boundaries.map(b => b[1]);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    return lat >= minLat && lat <= maxLat && lng >= minLon && lng <= maxLon;
}

// Les coordonnées sont maintenant gérées dynamiquement par getMunicipalityGeo dans lib/geoIntelligence.ts

export default function MapComponent({ 
    isMairie = false, 
    targetCity, 
    mairieId 
}: Readonly<{ 
    isMairie?: boolean;
    targetCity?: string;
    mairieId?: string;
}>) {
    const supabase = createClient();
    const [wastes, setWastes] = useState<WasteMarker[]>([]);
    const [agents, setAgents] = useState<AgentMarker[]>([]);
    const [zones, setZones] = useState<ZoneMarker[]>([]);
    const [infractions, setInfractions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUserLocation, setShowUserLocation] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const cityGeo = targetCity ? getMunicipalityGeo(targetCity) : null;

                // 1. Récupérer les déchets et types avec filtrage par ville
                let wastesQuery = supabase
                    .from('wastes')
                    .select('*, waste_types(*), seller:profiles!seller_id(city)')
                    .in('status', ['published', 'reserved'])
                    .not('latitude', 'is', null)
                    .not('longitude', 'is', null);

                const { data: wastesData } = await wastesQuery;

                // Ajout fetch infractions avec filtrage STRICT
                if (isMairie) {
                    let infractionsQuery = supabase
                        .from('environmental_infractions')
                        .select('*, profiles:reporter_id(full_name), zones:zone_id(city)')
                        .not('latitude', 'is', null)
                        .not('longitude', 'is', null);

                    const { data: infractionsData } = await infractionsQuery;
                    let filteredInfractions = infractionsData || [];
                    if (targetCity && cityGeo) {
                        filteredInfractions = filteredInfractions.filter((i: any) => {
                            if (i.latitude && i.longitude) {
                                return isPointInMunicipality(i.latitude, i.longitude, cityGeo);
                            }
                            const zoneCity = i.zones?.city?.toLowerCase();
                            const descLower = i.description?.toLowerCase() || "";
                            const typeLower = i.type?.toLowerCase() || "";
                            const targetCityClean = targetCity.replace(/Mairie de |Commune de |Ville de /gi, "").trim().toLowerCase();
                            return !zoneCity || zoneCity.includes(targetCityClean) || descLower.includes(targetCityClean) || typeLower.includes(targetCityClean);
                        });
                    }
                    setInfractions(filteredInfractions);
                }

                // 2. Récupérer les positions en temps réel
                const { data: trackingData } = await supabase
                    .from('agent_live_positions')
                    .select('*')
                    .order('timestamp', { ascending: false })
                    .limit(200);

                if (trackingData && trackingData.length > 0) {
                    // Déduplication pour n'avoir que la dernière position par agent
                    const latestPositions = trackingData.reduce((acc: any, curr: any) => {
                        if (!acc[curr.agent_id]) {
                            acc[curr.agent_id] = curr;
                        }
                        return acc;
                    }, {});

                    const agentIds = Object.keys(latestPositions);
                    const vehicleIds = Object.values(latestPositions).map((p: any) => p.vehicle_id).filter(Boolean);

                    // 3. Récupérer les profils et véhicules en parallèle (deuxième étape)
                    const [profilesRes, vehiclesRes] = await Promise.all([
                        agentIds.length > 0
                            ? supabase.from('profiles').select('id, full_name').in('id', agentIds)
                            : Promise.resolve({ data: [] }),
                        vehicleIds.length > 0
                            ? supabase.from('vehicles').select('id, name, type').in('id', vehicleIds)
                            : Promise.resolve({ data: [] })
                    ]);

                    // 4. Fusionner les données safely
                    const profilesMap = new Map((profilesRes?.data || []).map((p: any) => [p.id, p]));
                    const vehiclesMap = new Map((vehiclesRes?.data || []).map((v: any) => [v.id, v]));

                    const enrichedAgents = Object.values(latestPositions).map((pos: any) => ({
                        ...pos,
                        profiles: profilesMap.get(pos.agent_id),
                        vehicles: vehiclesMap.get(pos.vehicle_id)
                    }));

                    let finalAgents = enrichedAgents;
                    if (targetCity && cityGeo) {
                        finalAgents = enrichedAgents.filter((a: any) => {
                            if (a.latitude && a.longitude) {
                                return isPointInMunicipality(a.latitude, a.longitude, cityGeo);
                            }
                            return true;
                        });
                    }

                    setAgents(finalAgents as AgentMarker[]);
                }

                // 5. Récupérer les Zones et Concessions pour la Mairie (filtrées)
                if (isMairie) {
                    let zonesQuery = supabase
                        .from('zones')
                        .select('*, concessions(*, profiles(full_name))');
                    
                    if (mairieId) {
                        zonesQuery = zonesQuery.eq('organization_id', mairieId);
                    } else if (targetCity) {
                        zonesQuery = zonesQuery.eq('city', targetCity);
                    }

                    const { data: zonesData } = await zonesQuery;
                    setZones(zonesData || []);
                }

                try {
                    let fetchedWastes = wastesData || [];
                    if (targetCity && cityGeo) {
                        const targetCityClean = targetCity.replace(/Mairie de |Commune de |Ville de /gi, "").trim().toLowerCase();
                        fetchedWastes = fetchedWastes.filter((w: any) => {
                            if (w.latitude && w.longitude) {
                                return isPointInMunicipality(w.latitude, w.longitude, cityGeo);
                            }
                            const sellerCity = w.seller?.city?.toLowerCase();
                            const locationLower = w.location?.toLowerCase() || "";
                            return (sellerCity && sellerCity.includes(targetCityClean)) || 
                                   locationLower.includes(targetCityClean);
                        });
                    }
                    setWastes(fetchedWastes.filter((w: any) => w.latitude && w.longitude));
                } catch (e) { console.error("Map: Error processing wastes", e); }
            } catch (err) {
                console.error("MapComponent critical loading error, forcing resolver:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        const channel = supabase.channel('tracking_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_live_positions' }, fetchData)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const handleEmergencyDispatch = async (wasteId: string, lat: number, lon: number) => {
        if (agents.length === 0) {
            showToast("Aucun agent actif détecté sur le radar.", "error");
            return;
        }

        let closestAgent = agents[0];
        let minDistance = getDistanceKm(lat, lon, closestAgent.latitude, closestAgent.longitude);
        
        for (const agent of agents) {
            const d = getDistanceKm(lat, lon, agent.latitude, agent.longitude);
            if (d < minDistance) {
                minDistance = d;
                closestAgent = agent;
            }
        }

        const res = await dispatchEmergencyAgent(wasteId, closestAgent.agent_id);
        if (res.success) {
            showToast(`Mission assignée de force à ${closestAgent.profiles?.full_name || 'Agent'} (${minDistance.toFixed(1)}km)`, "success");
            // Optional: refetch or let real-time handle it
        } else {
            showToast("Échec: " + res.error, "error");
        }
    };

    // Calcul dynamique des limites géographiques (Bounds)
    const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

    useEffect(() => {
        if (loading) return;

        const bounds = L.latLngBounds([]);
        let hasPoints = false;

        // On inclut les déchets
        wastes.forEach(w => {
            if (w.latitude && w.longitude) {
                bounds.extend([w.latitude, w.longitude]);
                hasPoints = true;
            }
        });

        // On inclut les infractions
        infractions.forEach(i => {
            if (i.latitude && i.longitude) {
                bounds.extend([i.latitude, i.longitude]);
                hasPoints = true;
            }
        });

        // On inclut les zones
        zones.forEach(z => {
            if (z.latitude && z.longitude) {
                bounds.extend([z.latitude, z.longitude]);
                hasPoints = true;
            }
        });

        if (hasPoints && bounds.isValid()) {
            setMapBounds(bounds);
        } else if (targetCity) {
            // Fallback sur les coordonnées de la ville si aucun point n'est trouvé
            const cityGeo = getMunicipalityGeo(targetCity);
            if (cityGeo) {
                const cityBounds = L.latLngBounds([
                    [cityGeo.center[0] - 0.05, cityGeo.center[1] - 0.05],
                    [cityGeo.center[0] + 0.05, cityGeo.center[1] + 0.05]
                ]);
                setMapBounds(cityBounds);
            }
        }
    }, [wastes, infractions, zones, loading, targetCity]);

    if (loading) return (
        <div className="w-full h-[70vh] flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border border-gray-100 dark:border-zinc-800">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Initialisation du radar...</p>
        </div>
    );

    // Centre de secours si tout échoue
    const defaultGeo = targetCity ? getMunicipalityGeo(targetCity) : getMunicipalityGeo("Abidjan");
    const mapCenter: [number, number] = defaultGeo?.center || [5.3484, -4.0197];
    const mapZoom = defaultGeo?.zoom || 12;

    return (
        <div className="w-full h-[70vh] rounded-[3rem] overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl relative z-0 group">
            <RadarScanner />
            <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
                zoomControl={false}
            >
                <MapAdjuster bounds={mapBounds} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {showUserLocation && <LocationMarker />}

                {/* Affichage des polygones de zone */}
                {zones.map((zone) => {
                    if (!zone.boundaries?.geometry?.coordinates) return null;
                    
                    const isOccupied = zone.status === 'occupied' || zone.status === 'rented';
                    const zoneColor = isOccupied ? "#3b82f6" : "#22c55e";

                    // Inversion [lng, lat] -> [lat, lng] pour Leaflet
                    const pathOptions = {
                        fillColor: zoneColor,
                        fillOpacity: 0.15,
                        color: zoneColor,
                        weight: 3,
                        dashArray: '10, 10',
                        dashOffset: '0',
                    };

                    const positions = zone.boundaries.geometry.type === "MultiPolygon"
                        ? zone.boundaries.geometry.coordinates.map((poly: any) => 
                            poly[0].map((coord: [number, number]) => [coord[1], coord[0]])
                          )
                        : [zone.boundaries.geometry.coordinates[0].map((coord: [number, number]) => [coord[1], coord[0]])];

                    return (
                        <Polygon 
                            key={`poly-${zone.id}`}
                            positions={positions}
                            pathOptions={pathOptions}
                        />
                    );
                })}

                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={50}
                >
                    {wastes.map((waste) => {
                        const isSlaBreached = waste.created_at && (Date.now() - new Date(waste.created_at).getTime() > 48 * 3600 * 1000);
                        const isHotspot = !!(isMairie && isSlaBreached && waste.status !== 'reserved');

                        return (
                        <Marker
                            key={waste.id}
                            position={[waste.latitude, waste.longitude]}
                            icon={createCustomIcon(waste.waste_types.emoji, waste.status === 'published' ? '#22c55e' : '#f59e0b', isHotspot)}
                        >
                            <Popup className="premium-popup">
                                <div className="p-2 min-w-[220px] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
                                    <div className="flex flex-col gap-3 mb-4">
                                        {waste.images && waste.images.length > 0 && (
                                            <div className="w-full h-24 rounded-xl overflow-hidden mb-2">
                                                <img 
                                                    src={waste.images[0]} 
                                                    alt="Aperçu déchet" 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-xl">
                                                {waste.waste_types?.emoji || '🗑️'}
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-zinc-900 dark:text-white leading-tight mb-0.5">{waste.waste_types?.name}</div>
                                                <p className={`text-[9px] font-bold uppercase tracking-widest ${isHotspot ? 'text-red-600' : 'text-primary'}`}>
                                                    {getWasteStatusText(isHotspot, waste.status)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <div className="p-2 border border-gray-100 dark:border-zinc-800 rounded-xl flex items-center gap-2">
                                            <Package className="w-3 h-3 text-gray-400" />
                                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{waste.estimated_weight} kg</span>
                                        </div>
                                        <div className="p-2 border border-gray-100 dark:border-zinc-800 rounded-xl flex items-center gap-2">
                                            <MapPin className="w-3 h-3 text-gray-400" />
                                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 truncate">{waste.location}</span>
                                        </div>
                                    </div>

                                    {isMairie ? (
                                        <button
                                            onClick={() => handleEmergencyDispatch(waste.id, waste.latitude, waste.longitude)}
                                            disabled={waste.status === 'reserved'}
                                            className={cn(
                                                "block w-full py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg",
                                                getDispatchButtonClass(waste.status)
                                            )}
                                        >
                                            <span className="flex justify-center items-center gap-2">
                                                <Navigation size={12} />
                                                {waste.status === 'reserved' ? 'Action déjà en cours' : 'Dispatcher un Agent'}
                                            </span>
                                        </button>
                                    ) : (
                                        <Link
                                            href={`/marketplace/${waste.id}`}
                                            className="block w-full py-3 bg-zinc-900 text-white dark:bg-zinc-800 text-center rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg hover:shadow-primary/20"
                                        >
                                            Détails & Réserver
                                        </Link>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                        );
                    })}

                    {agents.map((agent) => (
                        <Marker
                            key={`agent-${agent.id}`}
                            position={[agent.latitude, agent.longitude]}
                            icon={createVehicleIcon(agent.vehicles?.type || 'truck')}
                        >
                            <Popup className="premium-popup">
                                <div className="p-3 min-w-[180px] bg-white dark:bg-zinc-900 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                            <Truck size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase italic dark:text-white leading-none mb-1">
                                                {agent.vehicles?.name || 'Unité de Collecte'}
                                            </h3>
                                            <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest leading-none">
                                                {agent.profiles?.full_name || 'Agent Terrain'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1 p-2 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center gap-2">
                                            <Zap size={10} className="text-amber-500" />
                                            <span className="text-[9px] font-black dark:text-gray-400">85%</span>
                                        </div>
                                        <div className="flex-1 p-2 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center gap-2">
                                            <div className="w-full h-1 bg-emerald-500 rounded-full mt-3 overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} className="h-full bg-emerald-600" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {isMairie && infractions.map((infraction) => (
                        <Marker 
                            key={`infraction-${infraction.id}`} 
                            position={[infraction.latitude, infraction.longitude]}
                            icon={L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div class="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-600/30 border-2 border-white animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>`,
                                iconSize: [40, 40],
                                iconAnchor: [20, 20]
                            })}
                        >
                            <Popup className="premium-popup">
                                <div className="p-4 min-w-[220px] bg-white dark:bg-zinc-950 rounded-[2rem]">
                                    {infraction.images && infraction.images.length > 0 && (
                                        <div className="w-full h-32 rounded-2xl overflow-hidden mb-4 border border-zinc-100">
                                            <img 
                                                src={infraction.images[0]} 
                                                alt="Preuve infraction" 
                                                className="w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-500"
                                            />
                                        </div>
                                    )}
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                                infraction.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                                {infraction.severity}
                                            </span>
                                            <span className="text-[8px] font-black px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full uppercase tracking-widest">
                                                {infraction.status}
                                            </span>
                                        </div>
                                        <h4 className="text-[11px] font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white leading-tight">
                                            {infraction.type}
                                        </h4>
                                        <p className="text-[9px] font-medium text-zinc-500 mt-1 line-clamp-2">
                                            {infraction.description || "Aucune description fournie."}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Signalé par</span>
                                            <span className="text-[9px] font-black uppercase text-zinc-900 dark:text-white truncate max-w-[100px]">
                                                {infraction.profiles?.full_name || "Agent Anonyme"}
                                            </span>
                                        </div>
                                        <button className="p-2 bg-zinc-900 text-white rounded-lg hover:bg-red-600 transition-colors">
                                            <Gavel size={14} />
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {isMairie && zones.map((zone) => {
                        // Position par défaut si non définie (Abidjan different areas)
                        const lat = zone.latitude || 5.3484;
                        const lon = zone.longitude || -4.0197;
                        
                        const isOccupied = zone.status === 'occupied' || zone.status === 'rented';
                        const zoneColor = isOccupied ? "#3b82f6" : "#22c55e"; // Blue vs Green
                        
                        return (
                            <Marker
                                key={`zone-${zone.id}`}
                                position={[lat, lon]}
                                icon={L.divIcon({
                                    html: `
                                        <div class="relative group">
                                            <div class="absolute -inset-8 rounded-full opacity-10 animate-pulse" style="background-color: ${zoneColor}"></div>
                                            <div class="w-12 h-12 bg-white dark:bg-zinc-900 border-4 rounded-2xl flex items-center justify-center shadow-2xl transition-all group-hover:scale-110" style="border-color: ${zoneColor}">
                                                <div class="text-[10px] font-black uppercase text-center leading-none" style="color: ${zoneColor}">
                                                    ${zone.name.substring(0, 3)}
                                                </div>
                                            </div>
                                        </div>
                                    `,
                                    className: 'zone-marker-icon',
                                    iconSize: [48, 48],
                                    iconAnchor: [24, 24]
                                })}
                            >
                                <Popup className="premium-popup">
                                    <div className="p-4 min-w-[200px] bg-white dark:bg-zinc-900 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: zoneColor }}>
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-xs uppercase italic dark:text-white">{zone.name}</h3>
                                                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: zoneColor }}>
                                                    {zone.status === 'occupied' ? 'Sous Concession' : 'Territoire Libre'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {isOccupied && zone.concessions && zone.concessions[0] && (
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/20 mb-2">
                                                <p className="text-[8px] font-black uppercase text-blue-600 mb-1">Partenaire Actif</p>
                                                <p className="text-[10px] font-bold dark:text-zinc-300">{(zone.concessions[0] as any).profiles?.full_name}</p>
                                            </div>
                                        )}
                                        
                                        {!isOccupied && (
                                            <p className="text-[9px] font-black uppercase text-zinc-400 italic mb-4">En attente d'agrément territorial</p>
                                        )}
                                        
                                        <div className="flex gap-2">
                                            <button className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl text-[8px] font-black uppercase hover:bg-white transition-all">Secteurs</button>
                                            {!isOccupied && <button className="flex-1 py-3 bg-primary text-white rounded-xl text-[8px] font-black uppercase shadow-lg shadow-primary/20">Attribuer</button>}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    })}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Floating Controls */}
            <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-3">
                <button 
                    onClick={() => setShowUserLocation(prev => !prev)}
                    className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl group/btn",
                        showUserLocation 
                            ? "bg-primary text-white scale-110" 
                            : "bg-white dark:bg-zinc-900 text-gray-500 hover:text-primary"
                    )}
                    title="Ma position"
                >
                    <Navigation className={cn("w-6 h-6", showUserLocation && "animate-pulse")} />
                </button>
            </div>

            <div className="absolute bottom-10 left-10 z-[1000] flex gap-4">
                <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-xl flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">
                        {wastes.length} Dépôts
                    </p>
                </div>
                <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-xl flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">
                        {agents.length} Agents Actifs
                    </p>
                </div>
            </div>

            <style jsx global>{`
                .leaflet-popup-content-wrapper {
                    padding: 0;
                    overflow: hidden;
                    border-radius: 1.5rem;
                    background: transparent;
                    box-shadow: none;
                }
                .leaflet-popup-content {
                    margin: 0;
                }
                .leaflet-popup-tip-container {
                    display: none;
                }
            `}</style>
        </div>
    );
}
