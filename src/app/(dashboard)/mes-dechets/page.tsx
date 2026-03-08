"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Trash2, Plus, Search, MapPin, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

export default function MyWastePage() {
    const supabase = useMemo(() => createClient(), []);

    const [wastes, setWastes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("published");
    const [userProfile, setUserProfile] = useState<any>(null);

    const tabs = [
        { id: "published", label: "Publiés" },
        { id: "reserved", label: "Réservés" },
        { id: "collected", label: "Collectés" },
    ];

    useEffect(() => {
        const fetchWastes = async () => {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;

                if (!user) {
                    console.warn("No user session found in mes-dechets.");
                    setLoading(false);
                    return;
                }

                console.log("Fetching wastes for user:", user.id);

                // Check if profile exists
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, role')
                    .eq('id', user.id)
                    .maybeSingle();

                setUserProfile(profile);

                const { data, error } = await supabase
                    .from('wastes')
                    .select('*, waste_types(name, emoji)')
                    .or(`seller_id.eq.${user.id},collector_id.eq.${user.id}`)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                console.log("Wastes fetched successfully:", data?.length, "items found.");
                if (data && data.length > 0) {
                    console.log("First item status:", data[0].status);
                    console.log("First item collector_id:", data[0].collector_id);
                }

                setWastes(data || []);
            } catch (err: any) {
                console.error("Error in fetchWastes:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchWastes();
    }, [supabase]);

    const filteredWastes = wastes.filter(w => w.status === activeTab);

    // Debug helper
    useEffect(() => {
        console.log("Current active tab:", activeTab);
        console.log("Number of filtered wastes:", filteredWastes.length);
    }, [activeTab, filteredWastes]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight uppercase">
                        <Trash2 className="w-8 h-8 text-primary" />
                        Mes Déchets
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 font-medium">
                        {userProfile?.role === 'collecteur'
                            ? "Historique des lots que vous avez réservés ou collectés."
                            : "Suivez en temps réel l'état de vos collectes et vos gains."}
                    </p>
                </div>
                {userProfile?.role !== 'collecteur' && (
                    <Link
                        href="/mes-dechets/publier"
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm uppercase tracking-widest"
                    >
                        <Plus className="w-5 h-5" />
                        Publier un lot
                    </Link>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-zinc-900 rounded-[2rem] mb-10 overflow-x-auto">
                {tabs.map((tab) => {
                    const count = wastes.filter(w => w.status === tab.id).length;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex-1 min-w-fit px-8 py-3.5 rounded-[1.5rem] text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest",
                                isActive
                                    ? "bg-white text-primary shadow-xl shadow-gray-200/50 dark:bg-zinc-800 dark:text-white dark:shadow-none"
                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            )}
                        >
                            {tab.label} <span className={cn("ml-1 opacity-50", isActive && "text-primary/50")}>({count})</span>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Chargement de vos trésors...</p>
                </div>
            ) : filteredWastes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredWastes.map((waste) => (
                        <div key={waste.id} className="group bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 overflow-hidden hover:shadow-2xl hover:shadow-gray-100 dark:hover:shadow-none transition-all duration-500 border-b-4 border-b-primary/20">
                            <div className="relative aspect-[4/3] overflow-hidden">
                                {waste.images?.[0] ? (
                                    <img src={waste.images[0]} alt={waste.waste_types?.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    <div className="w-full h-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-5xl">
                                        {waste.waste_types?.emoji || "♻️"}
                                    </div>
                                )}
                                <div className="absolute top-4 left-4">
                                    <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                                        {waste.waste_types?.name}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase">{new Date(waste.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <span className="text-xl font-black text-primary">
                                        {waste.estimated_weight} <span className="text-xs">kg</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-6 font-medium text-sm">
                                    <MapPin className="w-4 h-4 shrink-0 text-primary/60" />
                                    <span className="truncate">{waste.location}</span>
                                </div>
                                <Link
                                    href={`/mes-dechets/${waste.id}`}
                                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all group/btn"
                                >
                                    Détails & Suivi
                                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center border-4 border-dashed border-gray-50 dark:border-zinc-900 rounded-[3rem] px-6">
                    <div className="w-24 h-24 bg-gray-50 dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                        <Search className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Aucun déchet trouvé</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto font-medium leading-relaxed">
                        C'est un bon début pour l'environnement ! <br /> Publiez votre premier lot pour commencer à gagner.
                    </p>
                    <Link
                        href="/mes-dechets/publier"
                        className="mt-8 px-8 py-4 bg-primary/10 text-primary font-black rounded-2xl hover:bg-primary hover:text-white transition-all text-xs uppercase tracking-widest"
                    >
                        Publiez maintenant
                    </Link>
                </div>
            )}
        </div>
    );
}
