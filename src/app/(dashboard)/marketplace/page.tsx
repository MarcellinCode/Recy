"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ShoppingBag, Filter, MapPin, ArrowRight, Loader2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { MarketplaceSkeleton } from "@/components/ui/Skeleton";

export default function MarketplacePage() {
    const supabase = createClient();

    const [wastes, setWastes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
    const [filterByDistance, setFilterByDistance] = useState(false);

    useEffect(() => {
        // Get user location for geofencing
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.warn("Geolocation denied", err)
            );
        }

        const fetchMarketplace = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('wastes')
                    .select('*, waste_types(name, emoji), profiles!seller_id(full_name)')
                    .eq('status', 'published')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setWastes(data || []);
            } catch (err) {
                console.error("Error fetching marketplace:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMarketplace();
    }, [supabase]);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const displayWastes = useMemo(() => {
        let list = [...wastes];
        if (filterByDistance && userLoc) {
            list = list.map(w => ({
                ...w,
                distance: w.latitude && w.longitude ? calculateDistance(userLoc.lat, userLoc.lng, w.latitude, w.longitude) : Infinity
            })).sort((a, b) => a.distance - b.distance);
        }
        return list;
    }, [wastes, filterByDistance, userLoc]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Live Marketplace
                    </div>
                    <h1 className="text-5xl font-black text-gray-900 dark:text-white flex items-center gap-4 tracking-tighter uppercase italic">
                        <ShoppingBag className="w-10 h-10 text-primary" />
                        Marché <span className="text-primary">CITICLINE</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-3 font-medium max-w-md">
                        Explorez les opportunités de collecte. Réservez des lots et transformez les déchets en valeur.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={() => setFilterByDistance(!filterByDistance)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3.5 border-2 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-sm",
                            filterByDistance ? "bg-primary text-white border-primary" : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-gray-300 hover:border-primary"
                        )}
                    >
                        <MapPin className={cn("w-4 h-4", filterByDistance ? "text-white" : "text-primary")} />
                        {filterByDistance ? "Proximité Activée" : "Par Proximité"}
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-gray-300 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:border-primary transition-all shadow-sm">
                        <Filter className="w-4 h-4 text-primary" />
                        Filtres Avancés
                    </button>
                </div>
            </div>

            {loading ? (
                <MarketplaceSkeleton />
            ) : displayWastes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {displayWastes.map((waste) => (
                        <Link
                            key={waste.id}
                            href={`/marketplace/${waste.id}`}
                            className="group bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-zinc-800 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 relative"
                        >
                            <div className="aspect-[16/10] bg-gray-100 dark:bg-zinc-800 relative overflow-hidden">
                                {waste.images?.[0] ? (
                                    <img src={waste.images[0]} alt={waste.waste_types?.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-20 grayscale group-hover:grayscale-0 group-hover:scale-110 group-hover:opacity-100 transition-all">
                                        {waste.waste_types?.emoji || "♻️"}
                                    </div>
                                )}
                                <div className="absolute top-6 left-6 flex flex-col gap-2">
                                    <span className="px-4 py-2 bg-white/95 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg border border-gray-50">
                                        {waste.waste_types?.name}
                                    </span>
                                    {waste.distance && waste.distance !== Infinity && (
                                        <span className="px-4 py-2 bg-primary text-white backdrop-blur-md rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 w-fit">
                                            <MapPin className="w-3 h-3" />
                                            {waste.distance.toFixed(1)} km
                                        </span>
                                    )}
                                </div>
                                <div className="absolute top-6 right-6">
                                    <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                                        <ShoppingBag className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Poids Estimé</span>
                                        <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                                            {waste.estimated_weight} <span className="text-sm font-bold opacity-30 tracking-normal uppercase">kg</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Prix Potentiel</span>
                                        <p className="text-lg font-black text-primary">~{Math.round(waste.estimated_weight * 100)} <span className="text-[10px]">CFA</span></p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl mb-8 group-hover:bg-primary/5 transition-colors">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <MapPin className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate">{waste.location}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-900 bg-gray-200" />
                                        ))}
                                        <div className="pl-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            3 collecteurs intéressés
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-gray-50/50 dark:bg-zinc-900/50 rounded-[4rem] px-8 border-4 border-dotted border-gray-100 dark:border-zinc-800">
                    <div className="w-32 h-32 bg-white dark:bg-zinc-900 rounded-[3rem] flex items-center justify-center mb-10 shadow-2xl shadow-gray-200 dark:shadow-none">
                        <Search className="w-12 h-12 text-gray-200" />
                    </div>
                    <h3 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">Le marché est calme...</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-lg max-w-sm mx-auto font-medium leading-relaxed">
                        Revenez plus tard ou soyez le premier à publier un déchet dans votre zone !
                    </p>
                </div>
            )}
        </div>
    );
}
