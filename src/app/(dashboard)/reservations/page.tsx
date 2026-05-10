"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmCollection } from "@/app/actions/collection";
import { showToast } from "@/components/ui/toast";
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
            try {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Timeout Auth")), 5000)
                );
                
                const { data: { user } } = await Promise.race([
                    supabase.auth.getUser(),
                    timeoutPromise
                ]) as any;

                if (!user) {
                    setLoading(false);
                    return;
                }

                // Récupérer le profil pour connaître le rôle et la ville
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, city')
                    .eq('id', user.id)
                    .single();

                const fullUser = { ...user, ...profile };
                setCurrentUser(fullUser);

                let query = supabase
                    .from('wastes')
                    .select(`
                        id, status, estimated_weight, location, created_at,
                        waste_types!type_id(name, emoji),
                        seller:profiles!seller_id(id, full_name, city),
                        collector:profiles!collector_id(id, full_name)
                    `)
                    .eq('status', 'reserved');

                // Logique de filtrage par rôle
                if (profile?.role === 'mairie' && profile?.city) {
                    // La mairie voit tout ce qui se passe dans sa ville
                    query = query.ilike('seller.city', `%${profile.city}%`);
                } else {
                    // Un utilisateur normal ne voit que ses propres réservations
                    query = query.or(`seller_id.eq.${user.id},collector_id.eq.${user.id}`);
                }

                const { data, error } = await query.order('created_at', { ascending: false });

                if (error) throw error;
                setReservations(data as any[] || []);
            } catch (err) {
                console.error("Erreur lors de la récupération des réservations:", err);
                showToast("Erreur de synchronisation", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchReservations();
    }, []);

    const filteredReservations = reservations.filter(res => {
        if (!currentUser) return false;
        if (currentUser.role === 'mairie') return true;
        return currentTab === "collectes" 
            ? res.collector?.id === currentUser.id 
            : res.seller?.id === currentUser.id;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-zinc-950">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse">Synchronisation de vos réservations...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-16 min-h-screen pb-24">
            <header className="mb-12 relative">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
                <div className="flex items-center gap-6 mb-8">
                    <Link href="/dashboard" className="w-12 h-12 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md hover:-translate-x-1 transition-all">
                        <ArrowLeft className="w-5 h-5 dark:text-white" />
                    </Link>
                    <div className="h-px flex-1 bg-gradient-to-r from-zinc-200 dark:from-zinc-800 to-transparent" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter dark:text-white leading-[0.85]">
                            {currentUser?.role === 'mairie' ? "Supervision" : "Suivi des"} <br />
                            <span className="text-primary italic text-3xl sm:text-5xl">Réservations</span>
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800">
                        <div className="px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                            <span className="text-[10px] font-black uppercase text-zinc-400 block leading-none mb-1">
                                {currentUser?.role === 'mairie' ? "Total Ville" : "Total Actif"}
                            </span>
                            <span className="text-xl font-black italic dark:text-white leading-none">{reservations.length}</span>
                        </div>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-white dark:bg-zinc-900 p-1.5 rounded-[2.2rem] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 dark:shadow-none relative z-10">
                    {currentUser?.role === 'mairie' ? (
                        <div className="flex-1 flex items-center justify-center gap-3 py-4 text-[10px] font-black uppercase tracking-widest text-primary italic">
                            <Navigation className="w-4 h-4 animate-pulse" />
                            Activité en temps réel • {currentUser?.city}
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={() => setCurrentTab("collectes")}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all",
                                    currentTab === "collectes" 
                                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl" 
                                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                )}
                            >
                                <CalendarDays className={cn("w-4 h-4", currentTab === "collectes" ? "animate-bounce" : "")} />
                                Mes Collectes
                            </button>
                            <button 
                                onClick={() => setCurrentTab("ventes")}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all",
                                    currentTab === "ventes" 
                                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl" 
                                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                )}
                            >
                                <Package className={cn("w-4 h-4", currentTab === "ventes" ? "animate-bounce" : "")} />
                                Mes Ventes
                            </button>
                        </>
                    )}
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
                            <ReservationCard key={res.id} reservation={res} role={currentUser?.role === 'mairie' ? 'mairie' : currentTab} onFinalized={() => {
                                // Simple update to remove it from the list
                                setReservations(prev => prev.filter(r => r.id !== res.id));
                            }} />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div 
                        key="empty"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 sm:py-32 px-8 text-center bg-zinc-50/50 dark:bg-zinc-900/30 rounded-[3rem] border border-dashed border-zinc-200 dark:border-zinc-800"
                    >
                        <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800 relative group">
                            <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Clock className="w-10 h-10 text-zinc-300 dark:text-zinc-700 relative z-10 group-hover:text-primary transition-colors duration-500" />
                        </div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-3">
                            Aucune <span className="text-primary">réservation</span> active
                        </h3>
                        <p className="text-sm text-zinc-500 max-w-sm font-medium leading-relaxed mb-10">
                            {currentTab === "collectes" 
                                ? "Explorez le marché et réservez votre premier lot de déchets pour commencer à gagner." 
                                : "Vos publications n'ont pas encore été réservées. Elles apparaîtront ici dès qu'un collecteur s'y intéressera."}
                        </p>
                        <Link href={currentTab === "collectes" ? "/marketplace" : "/publier"} className="px-10 py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                            <Package className="w-4 h-4" />
                            {currentTab === "collectes" ? "Parcourir le Marché" : "Publier un Déchet"}
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ReservationCard({ reservation, role, onFinalized }: { reservation: Reservation, role: string, onFinalized?: () => void }) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [finalWeight, setFinalWeight] = useState(reservation.estimated_weight.toString());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFinalize = async () => {
        if (!finalWeight || isNaN(Number(finalWeight))) {
            showToast("Veuillez saisir un poids valide", "error");
            return;
        }
        setIsSubmitting(true);
        const res = await confirmCollection(reservation.id, Number(finalWeight));
        setIsSubmitting(false);
        if (res.success) {
            showToast("Collecte finalisée avec succès !", "success");
            setShowModal(false);
            if (onFinalized) onFinalized();
            router.push('/wallet'); // Redirect to wallet
        } else {
            showToast(res.error || "Une erreur est survenue", "error");
        }
    };

    const handleNavigate = () => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reservation.location)}`;
        window.open(url, '_blank');
    };

    return (
        <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 p-2 flex flex-col sm:flex-row shadow-sm hover:shadow-xl hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-500 group overflow-hidden"
        >
            {/* Info Section */}
            <div className="flex-1 p-6 sm:p-8">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                            {reservation.waste_types.emoji}
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter dark:text-white leading-none mb-1">
                                {reservation.waste_types.name}
                            </h3>
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Clock className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase tracking-widest italic">
                                    {new Date(reservation.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">En Attente</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                            <div className="w-7 h-7 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                                <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                                {role === 'mairie' ? (
                                    <>
                                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Binôme</span>
                                        <span className="text-[10px] font-black uppercase dark:text-zinc-200">
                                            {reservation.seller?.full_name || "Vendeur inconnu"} → {reservation.collector?.full_name || "En recherche"}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{role === "collectes" ? "Vendeur" : "Collecteur"}</span>
                                        <span className="text-[10px] font-black uppercase dark:text-zinc-200">
                                            {role === "collectes" ? (reservation.seller?.full_name || "Inconnu") : (reservation.collector?.full_name || "En recherche...")}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                            <div className="w-7 h-7 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                                <Weight className="w-3.5 h-3.5 font-bold" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Estimation</span>
                                <span className="text-[10px] font-black uppercase dark:text-zinc-200">{reservation.estimated_weight} KG</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 text-primary p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Lieu de Collecte</span>
                            <span className="text-[10px] font-black uppercase leading-tight line-clamp-2">{reservation.location}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Bar - Redesigned to be a sleek vertical bar on desktop and horizontal on mobile */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 border-t sm:border-t-0 sm:border-l border-zinc-100 dark:border-zinc-800 flex sm:flex-col items-center justify-center gap-2 sm:w-24">
                <Link 
                    href={`/chat?wasteId=${reservation.id}`}
                    title="Ouvrir le chat"
                    className="flex-1 sm:flex-none w-full aspect-square sm:w-16 sm:h-16 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[1.2rem] flex flex-col items-center justify-center gap-1 group/btn hover:border-primary/50 hover:shadow-lg transition-all"
                >
                    <MessageSquare className="w-5 h-5 text-zinc-400 group-hover/btn:text-primary transition-colors" />
                    <span className="text-[8px] font-black uppercase text-zinc-400 group-hover/btn:text-primary">Chat</span>
                </Link>
                
                {role !== "mairie" && role === "collectes" && (
                    <>
                        <button 
                            onClick={handleNavigate}
                            title="Lancer la navigation"
                            className="flex-1 sm:flex-none w-full aspect-square sm:w-16 sm:h-16 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[1.2rem] flex flex-col items-center justify-center gap-1 group/btn hover:border-primary/50 hover:shadow-lg transition-all"
                        >
                            <Navigation className="w-5 h-5 text-zinc-400 group-hover/btn:text-primary transition-colors" />
                            <span className="text-[8px] font-black uppercase text-zinc-400 group-hover/btn:text-primary">Itinéraire</span>
                        </button>
                        <button 
                            onClick={() => setShowModal(true)}
                            title="Soumettre la pesée finale"
                            className="flex-1 sm:flex-none w-full aspect-square sm:w-16 sm:h-16 bg-primary text-white rounded-[1.2rem] flex flex-col items-center justify-center gap-1 hover:scale-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            <CheckCircle2 className="w-5 h-5 animate-pulse" />
                            <span className="text-[8px] font-black uppercase opacity-70">Valider</span>
                        </button>
                    </>
                )}
            </div>

            {/* Modal de Finalisation */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800"
                        >
                            <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4 dark:text-white">Validation de Collecte</h3>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 border-l-2 border-primary pl-3">
                                Veuillez confirmer le poids réel pour le paiement.
                            </p>
                            
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                                Poids Réel (kg)
                            </label>
                            <input 
                                type="number" 
                                value={finalWeight} 
                                onChange={(e) => setFinalWeight(e.target.value)}
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl p-4 font-black text-xl italic outline-none focus:ring-2 focus:ring-primary dark:text-white transition-all mb-8"
                                placeholder="ex: 5.5"
                            />
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-zinc-200"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={handleFinalize}
                                    disabled={isSubmitting}
                                    className="flex-1 py-4 bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Finaliser
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
