"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, MapPin, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { navigateSafe } from "@/utils/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

export default function MyWastePage() {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const [wastes, setWastes] = useState<any[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("published");
    const [userProfile, setUserProfile] = useState<any>(null);

    const tabs = [
        { id: "published", label: "Publiés" },
        { id: "reserved", label: "Réservés" },
        { id: "collected", label: "Collectés" },
    ];

    // Extracted fetch function so it can be reused by realtime callback
    const fetchWastes = async (uid?: string, profile?: any) => {
        try {
            const resolvedUid = uid ?? userId;
            const activeProfile = profile ?? userProfile;
            if (!resolvedUid) return;

            let query = supabase
                .from('wastes')
                .select('*, waste_types(name, emoji), seller:profiles!seller_id(city)')
                .order('created_at', { ascending: false });

            if (activeProfile?.role === 'mairie' && activeProfile?.city) {
                // Utilisation de l'alias 'seller' pour le filtre
                query = query.ilike('seller.city', `%${activeProfile.city}%`);
            } else {
                query = query.or(`seller_id.eq.${resolvedUid},collector_id.eq.${resolvedUid}`);
            }

            const { data, error } = await query;

            if (error) throw error;
            setWastes(data || []);
        } catch (err: any) {
            console.error("Error in fetchWastes:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (!user) {
                setLoading(false);
                return;
            }

            setUserId(user.id);

            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, role, city')
                .eq('id', user.id)
                .maybeSingle();

            setUserProfile(profile);

            // Initial fetch
            await fetchWastes(user.id, profile);

            // ✅ Realtime sync — mise à jour auto sans refresh
            const channel = supabase
                .channel('mes-dechets-realtime')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'wastes' },
                    () => fetchWastes(user.id, profile)
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        init();
    }, []);

    const filteredWastes = wastes.filter(w => w.status === activeTab);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-zinc-950">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div className="absolute inset-0 blur-3xl bg-primary/30 animate-pulse" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse text-center">Synchronisation de l'inventaire...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24 min-h-screen pb-24 bg-zinc-950">
            <header className="mb-16 relative">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10" />
                
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Live Inventory</span>
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-white leading-[0.8] mb-2">
                            {userProfile?.role === 'mairie' ? "Stock" : "Mes"} <br />
                            <span className="text-primary italic font-serif">{userProfile?.role === 'mairie' ? "Urbain" : "Déchets"}</span>
                        </h1>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-4">
                            {userProfile?.role === 'mairie' 
                                ? `Supervision des flux de déchets • ${userProfile?.city}`
                                : "Suivez l'état de vos collectes et vos gains."}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-[2rem] border border-white/10 shadow-2xl">
                            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1 leading-none text-center">Total</p>
                            <p className="text-4xl font-black italic text-white leading-none tracking-tighter text-center">
                                {wastes.length.toString().padStart(2, '0')}
                            </p>
                        </div>

                        {userProfile?.role !== 'mairie' && userProfile?.role !== 'collecteur' && (
                            <button
                                onClick={() => navigateSafe(router, ROUTES.MARKETPLACE_PUBLISH)}
                                className="h-20 px-8 bg-primary text-white font-black rounded-[2rem] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center gap-3"
                            >
                                <Plus className="w-5 h-5" />
                                Publier
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs Switcher Glassmorphism */}
                <div className="p-1.5 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
                    <div className="flex overflow-x-auto hide-scrollbar">
                        {tabs.map((tab) => {
                            const count = wastes.filter(w => w.status === tab.id).length;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex-1 min-w-fit px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap",
                                        isActive
                                            ? "bg-white text-zinc-950 shadow-2xl scale-[1.02]"
                                            : "text-zinc-500 hover:text-white"
                                    )}
                                >
                                    {tab.label} <span className={cn("ml-2 opacity-40", isActive && "text-primary opacity-100 font-serif italic text-sm")}>{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {filteredWastes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredWastes.map((waste) => (
                        <div key={waste.id} className="group bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-700 relative">
                            <div className="relative aspect-[4/3] overflow-hidden">
                                {waste.images?.[0] ? (
                                    <img src={waste.images[0]} alt={waste.waste_types?.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                ) : (
                                    <div className="w-full h-full bg-zinc-900/50 flex items-center justify-center text-6xl grayscale group-hover:grayscale-0 transition-all">
                                        {waste.waste_types?.emoji || "♻️"}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60" />
                                <div className="absolute top-6 left-6">
                                    <span className="px-4 py-2 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-primary shadow-2xl">
                                        {waste.waste_types?.name}
                                    </span>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3 text-zinc-500">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{new Date(waste.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                        <span className="text-2xl font-black text-white italic font-serif">
                                            {waste.estimated_weight} <span className="text-[10px] uppercase not-italic text-zinc-500 ml-1">kg</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-zinc-400 mb-8 font-medium text-sm bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:border-primary/20 transition-colors">
                                    <MapPin className="w-4 h-4 shrink-0 text-primary animate-pulse" />
                                    <span className="text-xs font-bold leading-relaxed line-clamp-2 uppercase tracking-tight">{waste.location}</span>
                                </div>
                                <button
                                    onClick={() => navigateSafe(router, ROUTES.MES_DECHETS + `/${waste.id}`)}
                                    className="flex items-center justify-center gap-3 w-full py-5 bg-white text-zinc-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all duration-500 shadow-2xl active:scale-95 group/btn overflow-hidden relative"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        Détails & Suivi
                                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                                    </span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 sm:py-32 px-8 text-center bg-white/5 backdrop-blur-md rounded-[3rem] border border-dashed border-white/10 relative group overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="w-24 h-24 bg-white/5 dark:bg-zinc-900/50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl border border-white/10 relative z-10 group-hover:scale-110 transition-transform duration-500">
                        <Search className="w-10 h-10 text-zinc-500 group-hover:text-primary transition-colors" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-3 relative z-10">
                        {userProfile?.role === 'mairie' ? "Aucun flux détecté" : "Aucun déchet trouvé"}
                    </h3>
                    
                    <p className="text-zinc-500 text-sm max-w-xs mx-auto font-medium leading-relaxed mb-10 relative z-10">
                        {userProfile?.role === 'mairie' 
                            ? `Il n'y a actuellement aucun lot de déchets actifs à ${userProfile?.city}.`
                            : "C'est un bon début pour l'environnement ! Publiez votre premier lot pour commencer à gagner."}
                    </p>
                    
                    <button
                        onClick={() => userProfile?.role === 'mairie' ? fetchWastes() : navigateSafe(router, ROUTES.MARKETPLACE_PUBLISH)}
                        className="px-10 py-5 bg-white text-zinc-950 font-black rounded-[1.5rem] hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em] relative z-10 shadow-2xl"
                    >
                        {userProfile?.role === 'mairie' ? "Rafraîchir la vue" : "Publiez maintenant"}
                    </button>
                </div>
            )}
        </div>
    );
}
