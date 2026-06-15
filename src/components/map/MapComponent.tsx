"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { Truck, MapPin, Package, Navigation, Loader2, Zap, Gavel, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import MarkerClusterGroup from "react-leaflet-cluster";
import { cn } from "@/lib/utils";
import { dispatchEmergencyAgent } from "@/app/actions/mairie";
import { dispatchAgentToInfraction } from "@/app/actions/organisation";
import { showToast } from "@/components/ui/toast";
import { getMunicipalityGeo } from "@/lib/geoIntelligence";
import { useMapData } from "@/hooks/useMapData";

// ─────────────────────────────────────────────
// Helpers d'icônes (inchangés)
// ─────────────────────────────────────────────
function getMainColor(isHotspot: boolean, color: string): string {
    if (isHotspot) return "red-600";
    if (color === "#22c55e") return "primary";
    return "amber-500";
}

function getWasteStatusText(isHotspot: boolean, status: string): string {
    if (isHotspot) return "POINT NOIR (SLA >48h)";
    if (status === "reserved") return "Réservé";
    return "Disponible";
}

function getDispatchButtonClass(status: string): string {
    if (status === "reserved")
        return "bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed";
    return "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-500 hover:text-white hover:shadow-red-500/20";
}

const createCustomIcon = (emoji: string, color: string = "#22c55e", isHotspot: boolean = false) => {
    const mainColor = getMainColor(isHotspot, color);
    const ringClass = isHotspot
        ? "bg-red-600 opacity-60 animate-ping border-4 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.8)]"
        : `bg-${mainColor} opacity-20 animate-ping`;
    const iconBaseClass = isHotspot
        ? "bg-red-50 dark:bg-black border-red-600 shadow-[0_0_20px_rgba(220,38,38,1)] text-2xl"
        : `bg-white dark:bg-zinc-900 border-${mainColor} shadow-xl text-xl`;
    return L.divIcon({
        html: `
            <div class="relative flex items-center justify-center translate-y-[-20px]">
                <div class="absolute w-12 h-12 rounded-full ${ringClass}"></div>
                <div class="relative w-10 h-10 rounded-full border-4 flex items-center justify-center hover:scale-110 transition-transform ${iconBaseClass}">
                    ${emoji}
                </div>
                ${isHotspot ? '<div class="absolute -top-2 -right-2 text-xs bg-red-600 text-white font-black px-1 rounded-full shadow-lg border border-white z-50">!</div>' : ""}
            </div>`,
        className: "custom-div-icon",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
    });
};

const createVehicleIcon = (type: string) =>
    L.divIcon({
        html: `
            <div class="relative flex items-center justify-center">
                <div class="absolute w-10 h-10 bg-emerald-500 opacity-20 animate-pulse rounded-2xl"></div>
                <div class="relative w-8 h-8 bg-white dark:bg-zinc-900 border-2 border-emerald-500 rounded-xl flex items-center justify-center shadow-xl text-emerald-500">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 17h4V5H2v12h3m1 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M14 9h5l3 3v5h-3"/>
                    </svg>
                </div>
            </div>`,
        className: "vehicle-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

// ─────────────────────────────────────────────
// Sous-composants Leaflet
// ─────────────────────────────────────────────
function LocationMarker() {
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const map = useMap();
    useEffect(() => {
        map.locate().on("locationfound", (e) => {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        });
    }, [map]);
    const userIcon = L.divIcon({
        html: `<div class="relative flex items-center justify-center">
            <div class="absolute w-12 h-12 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
            <div class="absolute w-8 h-8 bg-blue-500 rounded-full opacity-40 animate-pulse"></div>
            <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg z-10"></div>
        </div>`,
        className: "user-location-icon",
    });
    return position ? <Marker position={position} icon={userIcon}><Popup>Vous êtes ici</Popup></Marker> : null;
}

function MapAdjuster({ bounds }: Readonly<{ bounds: L.LatLngBounds | null }>) {
    const map = useMap();
    useEffect(() => {
        if (bounds?.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }, [bounds, map]);
    return null;
}

function MapFocuser({ coords }: Readonly<{ coords: [number, number] | null }>) {
    const map = useMap();
    useEffect(() => {
        if (coords) map.flyTo(coords, 16, { animate: true, duration: 1.5 });
    }, [coords, map]);
    return null;
}

function RadarScanner() {
    return (
        <div className="absolute inset-0 pointer-events-none z-[400] overflow-hidden rounded-[3rem]">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 left-1/2 w-[200%] h-[150px] bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent -translate-x-1/2 -translate-y-1/2 origin-center"
                style={{ clipPath: "polygon(50% 50%, 100% 45%, 100% 55%)" }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-30" />
            <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 w-96 h-96 border border-emerald-500/20 rounded-full -translate-x-1/2 -translate-y-1/2"
            />
            <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-emerald-500/20 rounded-tl-2xl" />
            <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-emerald-500/20 rounded-tr-2xl" />
            <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-emerald-500/20 rounded-bl-2xl" />
            <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-emerald-500/20 rounded-br-2xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center opacity-20">
                <div className="w-10 h-[1px] bg-emerald-500"></div>
                <div className="h-10 w-[1px] bg-emerald-500 absolute"></div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Bannière d'erreurs partielle (non bloquante)
// Affiche les tables qui ont échoué sans vider la carte
// ─────────────────────────────────────────────
function PartialErrorBanner({ errors }: { errors: Record<string, string> }) {
    const keys = Object.keys(errors);
    if (keys.length === 0) return null;
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-full shadow-lg text-[10px] font-black uppercase tracking-widest">
            <AlertTriangle size={12} />
            Données partielles : {keys.join(", ")}
        </div>
    );
}

// ─────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────
export default function MapComponent({
    isMairie = false,
    targetCity,
    mairieId,
    organizationId,
    focusCoords,
    orgAgents = [],
}: Readonly<{
    isMairie?: boolean;
    targetCity?: string;
    mairieId?: string;
    organizationId?: string;
    focusCoords?: [number, number] | null;
    orgAgents?: any[];
}>) {
    const supabase = createClient();
    const [showUserLocation, setShowUserLocation] = useState(false);

    // ── Tout le chargement est délégué au hook ──
    const { wastes, agents, zones, infractions, loading, errors, refetch } = useMapData({
        supabase,
        isMairie,
        targetCity,
        mairieId,
        organizationId,
    });

    const [selectedAgentForInfraction, setSelectedAgentForInfraction] = useState<Record<string, string>>({});
    const [dispatchingInfractionId, setDispatchingInfractionId] = useState<string | null>(null);

    const handleOrgDispatch = async (infractionId: string) => {
        const agentId = selectedAgentForInfraction[infractionId];
        if (!agentId) {
            showToast("Veuillez sélectionner un agent de collecte.", "error");
            return;
        }

        setDispatchingInfractionId(infractionId);
        try {
            const res = await dispatchAgentToInfraction(infractionId, agentId);
            if (res.success) {
                showToast("Mission de nettoyage affectée avec succès !", "success");
                refetch();
            } else {
                showToast("Échec de l'affectation : " + res.error, "error");
            }
        } catch (err: any) {
            showToast("Erreur lors de l'affectation : " + err.message, "error");
        } finally {
            setDispatchingInfractionId(null);
        }
    };

    // ── Calcul des bounds ──
    const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
    useEffect(() => {
        if (loading) return;
        const bounds = L.latLngBounds([]);
        let hasPoints = false;
        [...wastes, ...infractions, ...zones].forEach((item: any) => {
            if (item.latitude && item.longitude) {
                bounds.extend([item.latitude, item.longitude]);
                hasPoints = true;
            }
        });
        if (hasPoints && bounds.isValid()) {
            setMapBounds(bounds);
        } else if (targetCity) {
            const geo = getMunicipalityGeo(targetCity);
            if (geo) {
                setMapBounds(L.latLngBounds([
                    [geo.center[0] - 0.05, geo.center[1] - 0.05],
                    [geo.center[0] + 0.05, geo.center[1] + 0.05],
                ]));
            }
        }
    }, [wastes, infractions, zones, loading, targetCity]);

    // ── Dispatch agent ──
    const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const handleEmergencyDispatch = async (wasteId: string, lat: number, lon: number) => {
        if (agents.length === 0) {
            showToast("Aucun agent actif détecté sur le radar.", "error");
            return;
        }
        let closest = agents[0];
        let minDist = getDistanceKm(lat, lon, closest.latitude, closest.longitude);
        for (const agent of agents) {
            const d = getDistanceKm(lat, lon, agent.latitude, agent.longitude);
            if (d < minDist) { minDist = d; closest = agent; }
        }
        const res = await dispatchEmergencyAgent(wasteId, closest.agent_id);
        if (res.success) {
            showToast(`Mission assignée à ${closest.profiles?.full_name || "Agent"} (${minDist.toFixed(1)} km)`, "success");
        } else {
            showToast("Échec : " + res.error, "error");
        }
    };

    // ── État de chargement ──
    if (loading) return (
        <div className="w-full h-[70vh] flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border border-gray-100 dark:border-zinc-800">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Initialisation du radar...</p>
        </div>
    );

    const defaultGeo = targetCity ? getMunicipalityGeo(targetCity) : getMunicipalityGeo("Abidjan");
    const mapCenter: [number, number] = defaultGeo?.center || [5.3484, -4.0197];
    const mapZoom = defaultGeo?.zoom || 12;

    return (
        <div className="w-full h-[70vh] rounded-[3rem] overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl relative z-0 group">
            <RadarScanner />

            {/* Bannière erreurs partielles — non bloquante */}
            <PartialErrorBanner errors={errors} />

            <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
                zoomControl={false}
            >
                <MapAdjuster bounds={mapBounds} />
                {focusCoords && <MapFocuser coords={focusCoords} />}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {showUserLocation && <LocationMarker />}

                {/* Polygones des zones */}
                {zones.map((zone) => {
                    if (!zone.boundaries?.geometry?.coordinates) return null;
                    const isOccupied = zone.status === "occupied" || zone.status === "rented";
                    const zoneColor = isOccupied ? "#3b82f6" : "#22c55e";
                    const positions = zone.boundaries.geometry.type === "MultiPolygon"
                        ? zone.boundaries.geometry.coordinates.map((poly: any) =>
                            poly[0].map((c: [number, number]) => [c[1], c[0]]))
                        : [zone.boundaries.geometry.coordinates[0].map((c: [number, number]) => [c[1], c[0]])];
                    return (
                        <Polygon
                            key={`poly-${zone.id}`}
                            positions={positions}
                            pathOptions={{ fillColor: zoneColor, fillOpacity: 0.15, color: zoneColor, weight: 3, dashArray: "10, 10" }}
                        />
                    );
                })}

                <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>

                    {/* Déchets */}
                    {wastes.map((waste) => {
                        const isSlaBreached = waste.created_at &&
                            Date.now() - new Date(waste.created_at).getTime() > 48 * 3600 * 1000;
                        const isHotspot = !!(isMairie && isSlaBreached && waste.status !== "reserved");
                        return (
                            <Marker
                                key={waste.id}
                                position={[waste.latitude, waste.longitude]}
                                icon={createCustomIcon(
                                    waste.waste_types?.emoji || "🗑️",
                                    waste.status === "published" ? "#22c55e" : "#f59e0b",
                                    isHotspot
                                )}
                            >
                                <Popup className="premium-popup">
                                    <div className="p-2 min-w-[220px] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
                                        {waste.images?.[0] && (
                                            <div className="w-full h-24 rounded-xl overflow-hidden mb-3">
                                                <img src={waste.images[0]} alt="Aperçu" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-xl">
                                                {waste.waste_types?.emoji || "🗑️"}
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-zinc-900 dark:text-white leading-tight mb-0.5">
                                                    {waste.waste_types?.name}
                                                </div>
                                                <p className={`text-[9px] font-bold uppercase tracking-widest ${isHotspot ? "text-red-600" : "text-primary"}`}>
                                                    {getWasteStatusText(isHotspot, waste.status)}
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
                                                disabled={waste.status === "reserved"}
                                                className={cn(
                                                    "block w-full py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg",
                                                    getDispatchButtonClass(waste.status)
                                                )}
                                            >
                                                <span className="flex justify-center items-center gap-2">
                                                    <Navigation size={12} />
                                                    {waste.status === "reserved" ? "Action déjà en cours" : "Dispatcher un Agent"}
                                                </span>
                                            </button>
                                        ) : (
                                            <Link
                                                href={`/marketplace/${waste.id}`}
                                                className="block w-full py-3 bg-zinc-900 text-white dark:bg-zinc-800 text-center rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg"
                                            >
                                                Détails & Réserver
                                            </Link>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Agents */}
                    {agents.map((agent) => (
                        <Marker
                            key={`agent-${agent.id}`}
                            position={[agent.latitude, agent.longitude]}
                            icon={createVehicleIcon(agent.vehicles?.type || "truck")}
                        >
                            <Popup className="premium-popup">
                                <div className="p-3 min-w-[180px] bg-white dark:bg-zinc-900 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                                            <Truck size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase italic dark:text-white leading-none mb-1">
                                                {agent.vehicles?.name || "Unité de Collecte"}
                                            </h3>
                                            <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">
                                                {agent.profiles?.full_name || "Agent Terrain"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1 p-2 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center gap-2">
                                            <Zap size={10} className="text-amber-500" />
                                            <span className="text-[9px] font-black dark:text-gray-400">85%</span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Infractions (Mairie uniquement) */}
                    {/* Infractions (Mairie ou Organisation) */}
                    {(isMairie || organizationId) && infractions.map((infraction) => {
                        const cleaningMission = wastes.find(
                            (w) =>
                                w.mission_type === "infraction_cleanup" &&
                                Math.abs(w.latitude - infraction.latitude) < 0.00001 &&
                                Math.abs(w.longitude - infraction.longitude) < 0.00001
                        );
                        const assignedAgentName = cleaningMission?.assigned_agent?.full_name || "Agent Terrain";

                        return (
                            <Marker
                                key={`infraction-${infraction.id}`}
                                position={[infraction.latitude, infraction.longitude]}
                                icon={L.divIcon({
                                    className: "custom-div-icon",
                                    html: `<div class="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-600/30 border-2 border-white animate-pulse">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                                            <path d="M12 9v4"/><path d="M12 17h.01"/>
                                        </svg>
                                    </div>`,
                                    iconSize: [40, 40],
                                    iconAnchor: [20, 20],
                                })}
                            >
                                <Popup className="premium-popup">
                                    <div className="p-4 min-w-[220px] bg-white dark:bg-zinc-900 rounded-[2rem]">
                                        {infraction.images?.[0] && (
                                            <div className="w-full h-32 rounded-2xl overflow-hidden mb-4 border border-zinc-100">
                                                <img src={infraction.images[0]} alt="Preuve" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${infraction.severity === "critical" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                                                    {infraction.severity}
                                                </span>
                                                <span className="text-[8px] font-black px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full uppercase tracking-widest">
                                                    {infraction.status === "open" ? "Non traité" : infraction.status === "investigating" ? "En cours" : "Résolu"}
                                                </span>
                                            </div>
                                            <h4 className="text-[11px] font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white">
                                                {infraction.type}
                                            </h4>
                                            <p className="text-[9px] font-medium text-zinc-500 mt-1 line-clamp-2">
                                                {infraction.description || "Aucune description."}
                                            </p>
                                        </div>

                                        {/* Action Section for Organizations */}
                                        {!isMairie && (
                                            <div className="mt-3 pt-3 border-t border-zinc-100">
                                                {infraction.status === "open" ? (
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">
                                                                Assigner un agent
                                                            </label>
                                                            <select
                                                                value={selectedAgentForInfraction[infraction.id] || ""}
                                                                onChange={(e) => setSelectedAgentForInfraction(prev => ({ ...prev, [infraction.id]: e.target.value }))}
                                                                className="w-full p-2 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl text-[10px] font-bold outline-none text-zinc-800 dark:text-zinc-200"
                                                            >
                                                                <option value="">Sélectionner un agent...</option>
                                                                {orgAgents.length === 0 ? (
                                                                    <option value="" disabled>Aucun agent disponible</option>
                                                                ) : (
                                                                    orgAgents.map((agent: any) => (
                                                                        <option key={agent.id} value={agent.id}>
                                                                            {agent.full_name}
                                                                        </option>
                                                                    ))
                                                                )}
                                                            </select>
                                                        </div>
                                                        <button
                                                            onClick={() => handleOrgDispatch(infraction.id)}
                                                            disabled={dispatchingInfractionId === infraction.id}
                                                            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                                                        >
                                                            {dispatchingInfractionId === infraction.id ? (
                                                                <Loader2 size={12} className="animate-spin" />
                                                            ) : (
                                                                <Navigation size={12} />
                                                            )}
                                                            Dépêcher un Agent
                                                        </button>
                                                    </div>
                                                ) : infraction.status === "investigating" ? (
                                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                                        <p className="text-[8px] font-black uppercase text-amber-600 dark:text-amber-400 mb-1">
                                                            Nettoyage en cours
                                                        </p>
                                                        <p className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                                                            Assigné à : <span className="font-black italic">{assignedAgentName}</span>
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                                        <p className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                                            ✓ Dépôt résorbé
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="pt-4 mt-3 border-t border-zinc-100 flex items-center justify-between">
                                            <div>
                                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Signalé par</span>
                                                <p className="text-[9px] font-black uppercase text-zinc-900 dark:text-white truncate max-w-[100px]">
                                                    {infraction.profiles?.full_name || "Agent Anonyme"}
                                                </p>
                                            </div>
                                            {isMairie && (
                                                <button className="p-2 bg-zinc-900 text-white rounded-lg hover:bg-red-600 transition-colors">
                                                    <Gavel size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Zones markers (Mairie uniquement) */}
                    {isMairie && zones.map((zone) => {
                        const lat = zone.latitude || 5.3484;
                        const lon = zone.longitude || -4.0197;
                        const isOccupied = zone.status === "occupied" || zone.status === "rented";
                        const zoneColor = isOccupied ? "#3b82f6" : "#22c55e";
                        return (
                            <Marker
                                key={`zone-${zone.id}`}
                                position={[lat, lon]}
                                icon={L.divIcon({
                                    html: `<div class="relative group">
                                        <div class="absolute -inset-8 rounded-full opacity-10 animate-pulse" style="background-color:${zoneColor}"></div>
                                        <div class="w-12 h-12 bg-white dark:bg-zinc-900 border-4 rounded-2xl flex items-center justify-center shadow-2xl" style="border-color:${zoneColor}">
                                            <div class="text-[10px] font-black uppercase text-center leading-none" style="color:${zoneColor}">${zone.name.substring(0, 3)}</div>
                                        </div>
                                    </div>`,
                                    className: "zone-marker-icon",
                                    iconSize: [48, 48],
                                    iconAnchor: [24, 24],
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
                                                    {isOccupied ? "Sous Concession" : "Territoire Libre"}
                                                </p>
                                            </div>
                                        </div>
                                        {isOccupied && zone.concessions?.[0] && (
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 mb-2">
                                                <p className="text-[8px] font-black uppercase text-blue-600 mb-1">Partenaire Actif</p>
                                                <p className="text-[10px] font-bold dark:text-zinc-300">
                                                    {(zone.concessions[0] as any).profiles?.full_name}
                                                </p>
                                            </div>
                                        )}
                                        {!isOccupied && (
                                            <p className="text-[9px] font-black uppercase text-zinc-400 italic mb-4">En attente d'agrément territorial</p>
                                        )}
                                        <div className="flex gap-2">
                                            <button className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl text-[8px] font-black uppercase">Secteurs</button>
                                            {!isOccupied && (
                                                <button className="flex-1 py-3 bg-primary text-white rounded-xl text-[8px] font-black uppercase shadow-lg shadow-primary/20">Attribuer</button>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Contrôles flottants */}
            <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-3">
                <button
                    onClick={() => setShowUserLocation((p) => !p)}
                    className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl",
                        showUserLocation
                            ? "bg-primary text-white scale-110"
                            : "bg-white dark:bg-zinc-900 text-gray-500 hover:text-primary"
                    )}
                    title="Ma position"
                >
                    <Navigation className={cn("w-6 h-6", showUserLocation && "animate-pulse")} />
                </button>
            </div>

            {/* Légende basse */}
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
                .leaflet-popup-content-wrapper { padding: 0; overflow: hidden; border-radius: 1.5rem; background: transparent; box-shadow: none; }
                .leaflet-popup-content { margin: 0; }
                .leaflet-popup-tip-container { display: none; }
            `}</style>
        </div>
    );
}
