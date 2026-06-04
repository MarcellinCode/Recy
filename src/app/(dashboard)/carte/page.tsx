"use client";

import dynamic from "next/dynamic";
import { MapPin, Info, Layers } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

// Import map dynamically to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import("@/components/map/MapComponent"), {
    ssr: false,
});

export default function CartePage() {
    const supabase = createClient();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                    setProfile(data);
                }
            } catch (e) {
                console.error("CartePage: error fetching profile", e);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const isMairieOrAdmin = profile?.role === 'mairie' || profile?.role === 'organisation_admin';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-4 mb-2 tracking-tighter uppercase italic">
                        <MapPin className="w-10 h-10 text-primary" />
                        Carte <span className="text-primary">CleanZone</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest pl-14">
                        Localisez les ressources disponibles en temps réel
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-6 py-3 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vue : Standard OSM</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    {loading ? (
                        <div className="w-full h-[70vh] bg-gray-50 dark:bg-zinc-900 rounded-[3rem] animate-pulse border border-gray-100 dark:border-zinc-800 flex items-center justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Chargement tactique de la carte...</p>
                        </div>
                    ) : (
                        <MapComponent 
                            isMairie={isMairieOrAdmin} 
                            targetCity={profile?.city} 
                            mairieId={isMairieOrAdmin ? profile?.id : undefined}
                            organizationId={!isMairieOrAdmin ? profile?.id : undefined}
                        />
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <h3 className="text-xs font-black text-gray-900 dark:text-white mb-4 uppercase tracking-[0.2em]">Légende</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-primary shadow-lg shadow-primary/20"></div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lots Disponibles</span>
                            </div>
                            <div className="flex items-center gap-3 opacity-50">
                                <div className="w-4 h-4 rounded-full bg-amber-500 shadow-lg shadow-amber-500/20"></div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lots Réservés</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 shadow-sm">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Info className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-[10px] font-black text-primary mb-2 uppercase tracking-widest">Pourquoi la carte ?</h3>
                        <p className="text-[10px] text-primary/70 font-bold italic leading-relaxed">
                            Elle permet d'optimiser vos trajets de collecte en visualisant les zones à forte densité de déchets recyclables.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
