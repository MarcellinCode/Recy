"use client";

import { useState, useEffect } from "react";
import { 
    Navigation, 
    CheckCircle2, 
    Clock, 
    MapPin, 
    Smartphone, 
    QrCode, 
    Package, 
    Star,
    ChevronRight,
    Map as MapIcon,
    Zap,
    AlertTriangle,
    ShieldCheck,
    Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { confirmCollection } from "@/app/actions/collection";

export default function AgentMissionsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [missions, setMissions] = useState<any[]>([]);
    const [stats, setStats] = useState({ done: 0, total: 0 });

    useEffect(() => {
        const fetchMissions = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch mixed missions:
            // 1. Marketplace wastes assigned as prio or reserved
            // 2. Subscription pickups for households in the zone
            const { data: wastes } = await supabase
                .from('wastes')
                .select('*, waste_types(*)')
                .eq('assigned_agent_id', user.id)
                .in('status', ['reserved', 'pending']);
            
            // Simulation of subscription pickups
            const mockSubs = [
                { id: 'sub1', type: 'subscription_pickup', name: 'Résidence Horizon', address: 'Bvd de Marseille, Immeuble B', priority: true },
                { id: 'sub2', type: 'subscription_pickup', name: 'Famille Kouamé', address: 'Rue L12, Villa 4', priority: false }
            ];

            const allMissions = [
                ...mockSubs,
                ...(wastes?.map((w: any) => ({ 
                    id: w.id, 
                    type: 'marketplace', 
                    name: w.waste_types?.name || 'Lot Recyclable',
                    address: 'Géolocalisé (Carte)',
                    priority: w.is_priority,
                    wasteData: w 
                })) || [])
            ].sort((a: any, b: any) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));

            setMissions(allMissions);
            setStats({ done: 0, total: allMissions.length });
            setLoading(false);
        };
        fetchMissions();
    }, []);
    
    const handleCollect = async (missionId: string, type: string) => {
        if (type !== 'marketplace') {
            showToast("Seuls les lots du marché peuvent être collectés manuellement depuis le Web pour le moment.", "info");
            return;
        }

        try {
            const mission = missions.find(m => m.id === missionId);
            const weight = mission?.wasteData?.estimated_weight || 0;
            
            const result = await confirmCollection(missionId, weight);

            if (!result.success) throw new Error(result.error);

            showToast("Lot collecté et paiement effectué !", "success");
            setMissions(prev => prev.filter(m => m.id !== missionId));
            setStats(prev => ({ ...prev, total: prev.total - 1 }));
        } catch (err: any) {
            console.error("Collection error:", err);
            showToast("Erreur lors de la collecte : " + err.message, "error");
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 py-8 space-y-8 mb-24">
            {/* Header / Summary */}
            <div className="flex items-center justify-between bg-zinc-900 rounded-[2.5rem] p-6 text-white overflow-hidden relative">
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Mission du Jour</p>
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Feuille <br /> de <span className="text-primary">Route</span></h1>
                </div>
                <div className="text-right relative z-10">
                    <p className="text-5xl font-black italic text-white leading-none">{stats.total}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Points d'arrêt</p>
                </div>
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                    <Navigation className="w-24 h-24" />
                </div>
            </div>

            {/* Quick Actions / Integration */}
            <div className="flex gap-4">
                <button onClick={() => showToast('Ouverture de la carte en cours', 'success')} className="flex-1 flex flex-col items-center gap-2 p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <MapIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">Voir Carte</span>
                </button>
                <button onClick={() => showToast('Lancement du scanner', 'success')} className="flex-1 flex flex-col items-center gap-2 p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <QrCode className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">Scanner QR</span>
                </button>
            </div>

            {/* Missions List */}
            <div className="space-y-6">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-2">
                    <Zap className="w-3 h-3 text-primary" />
                    Itinéraire Séquentiel
                </h2>

                <div className="space-y-4">
                    {missions.map((mission, idx) => (
                        <MissionCard 
                            key={mission.id} 
                            mission={mission} 
                            index={idx} 
                            onCollect={handleCollect}
                        />
                    ))}
                    {missions.length === 0 && !loading && (
                        <div className="text-center py-20 opacity-30">
                            <ShieldCheck className="w-12 h-12 mx-auto mb-4" />
                            <p className="font-bold uppercase tracking-widest text-[10px]">Aucune mission pour aujourd'hui</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MissionCard({ mission, index, onCollect }: any) {
    const isMarketplace = mission.type === 'marketplace';
    const [isCollecting, setIsCollecting] = useState(false);

    const handleAction = async () => {
        setIsCollecting(true);
        await onCollect(mission.id, mission.type);
        setIsCollecting(false);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
                "p-6 rounded-[2rem] border relative group transition-all",
                mission.priority 
                    ? "bg-white dark:bg-zinc-900 border-primary/30 shadow-lg shadow-primary/5" 
                    : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
            )}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        isMarketplace ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                    )}>
                        {isMarketplace ? <Package className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs">{mission.name}</h3>
                            {mission.priority && <span className="bg-primary text-white text-[8px] px-1.5 py-0.5 rounded font-black animate-pulse">PRIO</span>}
                        </div>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{isMarketplace ? 'Marché (Vente)' : 'Abonné (Collecte)'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black dark:text-white leading-none">#{index + 1}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-6 font-medium text-[10px]">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                {mission.address}
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={handleAction}
                    disabled={isCollecting}
                    className="flex-[2] py-4 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                >
                    {isCollecting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Collecter'}
                </button>
                <button onClick={() => showToast('Signalement enregistré', 'success')} className="flex-1 py-4 bg-gray-50 dark:bg-zinc-800 text-zinc-400 rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
                    <AlertTriangle className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}
