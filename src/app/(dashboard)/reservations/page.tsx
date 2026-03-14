"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
    CalendarDays, 
    ArrowLeft, 
    MessageSquare, 
    Navigation, 
    CheckCircle2, 
    Clock, 
    MapPin, 
    Package, 
    Loader2,
    ChevronRight,
    User,
    Weight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Reservation = {
    id: string;
    status: string;
    estimated_weight: number;
    location: string;
    created_at: string;
    waste_types: { name: string; emoji: string };
    seller: { full_name: string; id: string };
    collector: { full_name: string; id: string } | null;
};

export default function ReservationsPage() {
    const supabase = createClient();
    const [currentTab, setCurrentTab] = useState<"collectes" | "ventes">("collectes");
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const fetchReservations = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUser(user);

            const { data } = await supabase
                .from('wastes')
                .select(`
                    id, status, estimated_weight, location, created_at,
                    waste_types(name, emoji),
                    seller:profiles!seller_id(id, full_name),
                    collector:profiles!collector_id(id, full_name)
                `)
                .eq('status', 'reserved')
                .or(`seller_id.eq.${user.id},collector_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            setReservations(data as any[] || []);
            setLoading(false);
        };
        fetchReservations();
    }, [supabase]);

    const filteredReservations = reservations.filter(res => 
        currentTab === "collectes" 
            ? res.collector?.id === currentUser?.id 
            : res.seller?.id === currentUser?.id
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Synchronisation de vos réservations...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 min-h-screen pb-24">
            <header className="mb-10">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/dashboard" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 dark:text-white" />
                    </Link>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter dark:text-white">
                        Suivi des <span className="text-primary italic">Réservations</span>
                    </h1>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800 shadow-inner">
                    <button 
                        onClick={() => setCurrentTab("collectes")}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-3 py-3.5 rounded-[1.7rem] text-xs font-black uppercase tracking-widest transition-all",
                            currentTab === "collectes" 
                                ? "bg-white dark:bg-zinc-800 dark:text-white shadow-lg shadow-zinc-200/50 dark:shadow-none" 
                                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        )}
                    >
                        <CalendarDays className="w-4 h-4" />
                        Mes Collectes
                    </button>
                    <button 
                        onClick={() => setCurrentTab("ventes")}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-3 py-3.5 rounded-[1.7rem] text-xs font-black uppercase tracking-widest transition-all",
                            currentTab === "ventes" 
                                ? "bg-white dark:bg-zinc-800 dark:text-white shadow-lg shadow-zinc-200/50 dark:shadow-none" 
                                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        )}
                    >
                        <Package className="w-4 h-4" />
                        Mes Ventes
                    </button>
                </div>
            </header>

            <AnimatePresence mode="wait">
                {filteredReservations.length > 0 ? (
                    <motion.div 
                        key={currentTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {filteredReservations.map((res) => (
                            <ReservationCard key={res.id} reservation={res} role={currentTab} />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div 
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 px-8 text-center"
                    >
                        <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center mb-6">
                            <Clock className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
                        </div>
                        <h3 className="text-lg font-black uppercase italic tracking-tighter dark:text-white mb-2">Aucune réservation active</h3>
                        <p className="text-xs text-zinc-500 max-w-xs font-medium">
                            {currentTab === "collectes" 
                                ? "Explorez le marché pour réserver votre premier lot de déchets." 
                                : "Vos publications n'ont pas encore été réservées par un collecteur."}
                        </p>
                        <Link href={currentTab === "collectes" ? "/marketplace" : "/publier"} className="mt-8 px-8 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                            {currentTab === "collectes" ? "Parcourir le Marché" : "Publier un Déchet"}
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ReservationCard({ reservation, role }: { reservation: Reservation, role: string }) {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-50 dark:border-zinc-800 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 hover:border-primary/20 dark:hover:border-primary/20 transition-all group">
            {/* Info Section */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{reservation.waste_types.emoji}</span>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter dark:text-white truncate">
                        {reservation.waste_types.name}
                    </h3>
                </div>

                <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {role === "collectes" ? `Vendeur: ${reservation.seller.full_name}` : `Collecteur: ${reservation.collector?.full_name}`}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <Weight className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{reservation.estimated_weight}kg estimés</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{reservation.location}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full w-fit">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">En attente de collecte</span>
                </div>
            </div>

            {/* Actions Section */}
            <div className="flex flex-row sm:flex-col items-center justify-center gap-3">
                <Link 
                    href={`/chat?wasteId=${reservation.id}`}
                    className="flex-1 sm:w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-200/50 dark:shadow-none"
                >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest sm:hidden lg:inline">Chat</span>
                </Link>
                {role === "collectes" && (
                    <button className="flex-1 sm:w-full h-14 bg-primary text-white rounded-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">
                        <Navigation className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest sm:hidden lg:inline">Trajet</span>
                    </button>
                )}
                {role === "ventes" && (
                    <button className="flex-1 sm:w-full h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest sm:hidden lg:inline">Finaliser</span>
                    </button>
                )}
            </div>
        </div>
    );
}
