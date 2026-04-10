"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { Truck, MapPin, Package, Navigation, Loader2 } from "lucide-react";
import MarkerClusterGroup from "react-leaflet-cluster";
import { cn } from "@/lib/utils";
import { dispatchEmergencyAgent } from "@/app/actions/mairie";
import { showToast } from "@/components/ui/toast";

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
    concessions?: {
        profiles?: { full_name: string }
    }[];
}

// Custom Icon Creator
const createCustomIcon = (emoji: string, color: string = "#22c55e", isHotspot: boolean = false) => {
    const mainColor = isHotspot ? 'red-600' : (color === '#22c55e' ? 'primary' : 'amber-500');
    const ringClass = isHotspot ? 'bg-red-600 opacity-60 animate-ping border-4 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.8)]' : `bg-${mainColor} opacity-20 animate-ping`;
    const iconBaseClass = isHotspot ? 'bg-red-50 dark:bg-black border-red-600 shadow-[0_0_20px_rgba(220,38,38,1)] text-2xl' : `bg-white dark:bg-zinc-900 border-${mainColor} shadow-xl text-xl`;

    return L.divIcon({
        html: `
            <div class="relative flex items-center justify-center">
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

export default function MapComponent({ isMairie = false }: { isMairie?: boolean }) {
    const supabase = createClient();
    const [wastes, setWastes] = useState<WasteMarker[]>([]);
    const [agents, setAgents] = useState<AgentMarker[]>([]);
    const [zones, setZones] = useState<ZoneMarker[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUserLocation, setShowUserLocation] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            // 1. Récupérer les déchets et types
            const { data: wastesData } = await supabase
                .from('wastes')
                .select('*, waste_types(*)')
                .in('status', ['published', 'reserved'])
                .not('latitude', 'is', null)
                .not('longitude', 'is', null);

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
                    supabase.from('profiles').select('id, full_name').in('id', agentIds),
                    supabase.from('vehicles').select('id, name, type').in('id', vehicleIds)
                ]);

                // 4. Fusionner les données
                const enrichedAgents = Object.values(latestPositions).map((pos: any) => ({
                    ...pos,
                    profiles: profilesRes.data?.find((p: any) => p.id === pos.agent_id),
                    vehicles: vehiclesRes.data?.find((v: any) => v.id === pos.vehicle_id)
                }));

                setAgents(enrichedAgents as AgentMarker[]);
            }

            // 5. Récupérer les Zones et Concessions pour la Mairie
            if (isMairie) {
                const { data: zonesData } = await supabase
                    .from('zones')
                    .select('*, concessions(*, profiles(full_name))');
                setZones(zonesData || []);
            }

            setWastes(wastesData || []);
            setLoading(false);
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

    if (loading) return (
        <div className="w-full h-[70vh] flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border border-gray-100 dark:border-zinc-800">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Initialisation du radar...</p>
        </div>
    );

    return (
        <div className="w-full h-[70vh] rounded-[3rem] overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl relative z-0 group">
            <MapContainer
                center={[6.37, 2.40]} // Cotonou
                zoom={12}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {showUserLocation && <LocationMarker />}

                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={50}
                >
                    {wastes.map((waste) => {
                        const isSlaBreached = waste.created_at && (new Date().getTime() - new Date(waste.created_at).getTime() > 48 * 3600 * 1000);
                        const isHotspot = !!(isMairie && isSlaBreached && waste.status !== 'reserved');

                        return (
                        <Marker
                            key={waste.id}
                            position={[waste.latitude, waste.longitude]}
                            icon={createCustomIcon(waste.waste_types.emoji, waste.status === 'published' ? '#22c55e' : '#f59e0b', isHotspot)}
                        >
                            <Popup className="premium-popup">
                                <div className="p-1 min-w-[220px] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
                                    <div className={`flex items-center gap-3 mb-4 p-2 rounded-xl ${isHotspot ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-zinc-800'}`}>
                                        <div className="text-3xl bg-white dark:bg-zinc-900 p-2 rounded-lg shadow-sm">
                                            {waste.waste_types.emoji}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-tight italic">
                                                {waste.waste_types.name}
                                            </h3>
                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isHotspot ? 'text-red-600' : 'text-primary'}`}>
                                                {isHotspot ? 'POINT NOIR (SLA >48h)' : (waste.status === 'reserved' ? 'Réservé' : 'Disponible')}
                                            </p>
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
                                            className={`block w-full py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${waste.status === 'reserved' ? 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-500 hover:text-white hover:shadow-red-500/20'}`}
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
                    )})}
                    
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
