"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { Truck, MapPin, Package } from "lucide-react";

// Fix for Leaflet default icon issues in Next.js
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapComponent() {
    const supabase = createClient();
    const [wastes, setWastes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Chargement de la carte des ressources...</p>
        </div>
    );

    return (
        <div className="w-full h-[70vh] rounded-[3rem] overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl relative z-0">
            <MapContainer
                center={[6.37, 2.40]} // Default to Cotonou/Abidjan region roughly
                zoom={12}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {wastes.map((waste) => (
                    <Marker
                        key={waste.id}
                        position={[waste.latitude, waste.longitude]}
                    >
                        <Popup className="custom-popup">
                            <div className="p-2 min-w-[200px]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{waste.waste_types.emoji}</span>
                                    <h3 className="font-bold text-gray-900">{waste.waste_types.name}</h3>
                                </div>
                                <div className="space-y-1 mb-3">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Package className="w-3 h-3" />
                                        <span>Est. {waste.estimated_weight} kg</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <MapPin className="w-3 h-3" />
                                        <span>{waste.location}</span>
                                    </div>
                                </div>
                                <Link
                                    href={`/marketplace/${waste.id}`}
                                    className="block w-full py-2 bg-primary text-white text-center rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-colors"
                                >
                                    Détails & Réserver
                                </Link>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
