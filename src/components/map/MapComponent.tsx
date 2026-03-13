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
}

// Custom Icon Creator
const createCustomIcon = (emoji: string, color: string = "#22c55e") => {
    return L.divIcon({
        html: `
            <div class="relative flex items-center justify-center">
                <div class="absolute w-10 h-10 bg-${color === '#22c55e' ? 'primary' : 'amber-500'} rounded-full opacity-20 animate-ping"></div>
                <div class="relative w-10 h-10 bg-white dark:bg-zinc-900 rounded-full border-4 border-${color === '#22c55e' ? 'primary' : 'amber-500'} shadow-xl flex items-center justify-center text-xl hover:scale-110 transition-transform">
                    ${emoji}
                </div>
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

export default function MapComponent() {
    const supabase = createClient();
    const [wastes, setWastes] = useState<WasteMarker[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUserLocation, setShowUserLocation] = useState(false);

    useEffect(() => {
        const fetchWastes = async () => {
            const { data } = await supabase
                .from('wastes')
                .select('*, waste_types(*)')
                .eq('status', 'published')
                .not('latitude', 'is', null)
                .not('longitude', 'is', null);

            setWastes(data || []);
            setLoading(false);
        };

        fetchWastes();
    }, [supabase]);

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
                    // Custom cluster icon could be added here if needed
                >
                    {wastes.map((waste) => (
                        <Marker
                            key={waste.id}
                            position={[waste.latitude, waste.longitude]}
                            icon={createCustomIcon(waste.waste_types.emoji, waste.status === 'published' ? '#22c55e' : '#f59e0b')}
                        >
                            <Popup className="premium-popup">
                                <div className="p-1 min-w-[220px] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
                                    <div className="flex items-center gap-3 mb-4 p-2 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                        <div className="text-3xl bg-white dark:bg-zinc-900 p-2 rounded-lg shadow-sm">
                                            {waste.waste_types.emoji}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-tight italic">
                                                {waste.waste_types.name}
                                            </h3>
                                            <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Disponible</p>
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

                                    <Link
                                        href={`/marketplace/${waste.id}`}
                                        className="block w-full py-3 bg-zinc-900 text-white dark:bg-zinc-800 text-center rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg hover:shadow-primary/20"
                                    >
                                        Détails & Réserver
                                    </Link>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
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

            <div className="absolute bottom-10 left-10 z-[1000] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">
                    <span className="text-primary mr-2">●</span> {wastes.length} Lots trouvés
                </p>
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
