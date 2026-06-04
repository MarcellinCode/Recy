"use client";

import { useState, useEffect, useMemo, useRef, Suspense, use } from "react";
import { ArrowLeft, MapPin, Calendar, ShieldCheck, MessageSquare, Truck, Loader2, ChevronRight, Check, Scan } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { navigateSafe } from "@/utils/navigation";
import { useWasteDetails } from "@/hooks/useWasteDetails";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { RatingModal } from "@/components/ui/RatingModal";
import { showToast } from "@/components/ui/toast";
import { wasteService } from "@/services/wasteService";

interface SwipeToReserveProps {
    onReserve: () => void;
    isLoading: boolean;
    isSuccess: boolean;
}

function SwipeToReserve({ onReserve, isLoading, isSuccess }: SwipeToReserveProps) {
    const [progress, setProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const handleStart = () => {
        if (isLoading || isSuccess) return;
        isDragging.current = true;
    };

    const handleMove = (clientX: number) => {
        if (!isDragging.current || !containerRef.current || isLoading || isSuccess) return;
        const rect = containerRef.current.getBoundingClientRect();
        const maxScroll = rect.width - 56;
        const currentX = Math.max(0, Math.min(clientX - rect.left - 28, maxScroll));
        setProgress(currentX / maxScroll);
    };

    const handleEnd = () => {
        if (!isDragging.current) return;
        isDragging.current = false;
        if (progress > 0.95) {
            setProgress(1);
            onReserve();
        } else {
            setProgress(0);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
        const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
        const handleMouseUp = handleEnd;

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchend', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [progress, isLoading, isSuccess]);

    if (isSuccess) {
        return (
            <div className="w-full h-16 bg-green-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-green-500/30 transition-all duration-500">
                <Check className="w-6 h-6 mr-2 animate-bounce" />
                <span className="font-black uppercase tracking-widest text-sm">Réservé !</span>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="w-full h-16 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-primary/30 transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                <Loader2 className="w-6 h-6 mr-2 animate-spin relative z-10" />
                <span className="font-black uppercase tracking-widest text-sm relative z-10">Création du canal...</span>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="w-full h-16 bg-gray-100 dark:bg-zinc-800 rounded-[2rem] relative flex items-center justify-center overflow-hidden cursor-pointer select-none border-2 border-transparent hover:border-primary/20 transition-colors"
        >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest text-[11px] ml-8 opacity-60">Glisser pour réserver</span>
            </div>
            
            <div 
                className="absolute left-0 top-0 bottom-0 bg-primary/10 transition-all duration-75"
                style={{ width: `${progress * 100}%` }}
            />

            <div 
                className="absolute left-1 top-1 bottom-1 w-14 bg-primary rounded-full flex gap-1 items-center justify-center text-white shadow-lg cursor-grab active:cursor-grabbing z-10 hover:scale-[1.02] transition-transform duration-75"
                style={{ transform: `translateX(${progress * (containerRef.current ? containerRef.current.offsetWidth - 56 - 8 : 0)}px)` }}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
            >
                <ChevronRight className="w-5 h-5 ml-1" />
                <ChevronRight className="w-5 h-5 -ml-3 opacity-50" />
            </div>
        </div>
    );
}

function Confetti() {
    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(50)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-2 h-2 rounded-sm bg-primary origin-center"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `-20px`,
                        animation: `fall ${Math.random() * 3 + 2}s linear forwards`,
                        animationDelay: `${Math.random() * 0.5}s`,
                        transform: `rotate(${Math.random() * 360}deg)`,
                        backgroundColor: ['#22c55e', '#3b82f6', '#eab308', '#ec4899'][Math.floor(Math.random() * 4)]
                    }}
                />
            ))}
            <style>{`
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(720deg);
                    }
                }
            `}</style>
        </div>
    );
}

function WasteDetailsContent({ id }: { id: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);
    const view = searchParams.get("view") || "buyer";

    const { 
        waste, 
        loading, 
        error: fetchError, 
        actionLoading, 
        setActionLoading,
        reserve
    } = useWasteDetails(id);

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showRatingModal, setShowRatingModal] = useState(false);
    
    // Premium Reservation State
    const [isReserving, setIsReserving] = useState(false);
    const [reservationSuccess, setReservationSuccess] = useState(false);
    const [fakeDistance] = useState(() => (Math.random() * 4 + 1).toFixed(1));
    const [fakeDuration] = useState(() => Math.floor(Math.random() * 15 + 5));
    const [showConfetti, setShowConfetti] = useState(false);

    const [userTier, setUserTier] = useState<string | null>(null);
    const [reservationCount, setReservationCount] = useState<number>(0);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUser(user);
                const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
                setUserTier(profile?.subscription_tier || 'free');
                
                if (profile?.subscription_tier === 'free' || !profile?.subscription_tier) {
                    const count = await wasteService.getMonthlyReservationCount(user.id);
                    setReservationCount(count);
                }
            }
        };
        fetchUser();
    }, [supabase]);

    const handleReserve = async () => {
        if (!currentUser) {
            navigateSafe(router, ROUTES.CONNEXION);
            return;
        }

        setIsReserving(true);
        const success = await reserve(currentUser.id);
        
        if (success) {
            setReservationSuccess(true);
            setShowConfetti(true);
            
            setTimeout(() => {
                router.refresh();
                navigateSafe(router, ROUTES.CHAT, { wasteId: id });
            }, 3000);
        } else {
            setIsReserving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Analyse du lot en cours...</p>
            </div>
        );
    }

    if (fetchError || !waste) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-black text-gray-900 mb-4">Oups !</h1>
                <p className="text-gray-500 mb-8">{fetchError || "Ce lot n'existe plus ou a déjà été retiré."}</p>
                <button onClick={() => navigateSafe(router, ROUTES.MARKETPLACE)} className="text-primary font-bold hover:underline">Retour au marché</button>
            </div>
        );
    }

    const estimatedValue = Math.round(waste.estimated_weight * (waste.waste_types?.price_per_kg || 150));

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 relative">
            {showConfetti && <Confetti />}
            <button 
                onClick={() => navigateSafe(router, view === "seller" ? ROUTES.MES_DECHETS : ROUTES.MARKETPLACE)} 
                className="inline-flex items-center gap-2 text-gray-400 hover:text-primary mb-10 transition-all font-black uppercase tracking-widest text-[10px]"
            >
                <ArrowLeft className="w-4 h-4" />
                Détails du lot
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-12 xl:col-span-8 space-y-8">
                    <div className="space-y-4">
                        <div className="aspect-[21/9] bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border-4 border-white dark:border-zinc-800 shadow-2xl overflow-hidden relative group">
                            {waste.images && waste.images.length > 0 ? (
                                <img src={waste.images[activeImageIndex]} alt={waste.waste_types?.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-8xl grayscale opacity-20">
                                    {waste.waste_types?.emoji || "♻️"}
                                </div>
                            )}
                            <div className="absolute top-8 left-8">
                                <span className={cn(
                                    "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl backdrop-blur-md",
                                    waste.status === 'published' ? "bg-primary text-white" : "bg-amber-500 text-white"
                                )}>
                                    {waste.status === 'published' ? 'Disponible' : 'Réservé'}
                                </span>
                            </div>
                        </div>

                        {waste.images && waste.images.length > 1 && (
                            <div className="flex gap-4 px-2">
                                {waste.images.map((img: string, idx: number) => (
                                    <button key={idx} onClick={() => setActiveImageIndex(idx)} className={cn("w-24 aspect-square rounded-2xl overflow-hidden border-4 transition-all", activeImageIndex === idx ? "border-primary scale-105 shadow-lg" : "border-white dark:border-zinc-800 opacity-60 hover:opacity-100")}>
                                        <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border border-gray-100 dark:border-zinc-800 shadow-sm">
                            <div className="mb-10 flex items-start justify-between">
                                <div>
                                    <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tighter italic">{waste.waste_types?.name}</h1>
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-widest"><Calendar className="w-4 h-4 text-primary" />Publié le {new Date(waste.created_at).toLocaleDateString('fr-FR')}</div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vendeur</p>
                                    <p className="font-black text-gray-900 dark:text-white uppercase">{waste.profiles?.full_name || "Anonyme"}</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Informations Complémentaires</h2>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{waste.description || "Aucune description supplémentaire fournie pour ce lot."}</p>
                            </div>
                        </div>

                        <div className="bg-zinc-900 text-white rounded-[3rem] p-10 flex flex-col justify-between relative overflow-hidden group">
                            <div className="relative z-10">
                                <h2 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-8">Estimation CleanZone</h2>
                                <div className="space-y-6">
                                    <div><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Poids Brut</p><p className="text-4xl font-black text-white">{waste.estimated_weight} <span className="text-sm font-bold opacity-30">kg</span></p></div>
                                    <div><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Gain Estimé</p><p className="text-4xl font-black text-primary">{estimatedValue} <span className="text-sm font-bold opacity-30">CFA</span></p></div>
                                </div>
                            </div>
                            <ShieldCheck className="absolute -bottom-10 -right-10 w-40 h-40 text-white/5 group-hover:rotate-12 transition-transform duration-700" />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-12 xl:col-span-4 lg:sticky lg:top-24 h-fit">
                    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border-2 border-primary/10 p-10 shadow-2xl shadow-primary/5">
                        <div className="space-y-6 mb-10">
                            <div className="flex items-center gap-4 p-5 bg-gray-50 dark:bg-zinc-800 rounded-3xl">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><MapPin className="w-6 h-6 text-primary" /></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Lieu de collecte</p><p className="font-black text-gray-900 dark:text-white truncate max-w-[180px] uppercase text-sm">{waste.location}</p></div>
                            </div>
                        </div>

                        {view === "buyer" ? (
                            <div className="space-y-6">
                                {waste.status === 'published' ? (
                                    <>
                                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <MapPin className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Distance Estimée</p>
                                                    <p className="text-xs font-bold text-gray-500">📍 ~{fakeDistance} km (${fakeDuration} min)</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-1 rounded">Trajet Optimal</span>
                                            </div>
                                        </div>

                                        {userTier === 'free' && (
                                            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                                    <span className="text-[10px] font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest">
                                                        Quota : {reservationCount}/3 réservations
                                                    </span>
                                                </div>
                                                <Link href="/abonnements" className="text-[9px] font-black text-amber-600 hover:underline uppercase tracking-widest">
                                                    Illimité →
                                                </Link>
                                            </div>
                                        )}

                                        <SwipeToReserve
                                            onReserve={handleReserve}
                                            isLoading={actionLoading || isReserving}
                                            isSuccess={reservationSuccess}
                                        />

                                        <button 
                                            onClick={() => navigateSafe(router, ROUTES.CHAT, { wasteId: id })} 
                                            className="w-full py-5 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white font-black rounded-[2rem] hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs border-2 border-transparent hover:border-gray-200 dark:hover:border-zinc-600"
                                        >
                                            <MessageSquare className="w-4 h-4" /> Poser une question au vendeur
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-8 bg-amber-50 dark:bg-amber-950/20 rounded-[2rem] border border-amber-100 dark:border-amber-900/30 text-center">
                                            <p className="font-black text-amber-900 dark:text-amber-400 uppercase text-xs mb-1">{waste.status === 'reserved' ? "Déjà réservé" : "Collecté"}</p>
                                            <p className="text-amber-700/70 dark:text-amber-500/70 text-[10px] font-bold uppercase tracking-wider">{waste.status === 'reserved' ? "Ce lot est en cours de traitement." : "Ce lot a été collecté avec succès."}</p>
                                            {waste.status === 'collected' && (
                                                <button onClick={() => setShowRatingModal(true)} className="mt-4 px-6 py-2 bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-600/20">Donner mon avis</button>
                                            )}
                                        </div>
                                        {currentUser?.id === waste.collector_id && (
                                            <div className="space-y-4">
                                                <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border-2 border-amber-100 dark:border-amber-900/30">
                                                    <div className="flex flex-col gap-4 mb-8">
                                                        <button 
                                                            onClick={async () => {
                                                                // Simulate QR Code Scan
                                                                showToast("QR Code reconnu ! Validation en cours...", "success");
                                                                
                                                                // Artificial delay for realism
                                                                await new Promise(r => setTimeout(r, 1000));
                                                                
                                                                const weight = prompt("Confirmez le poids final en KG :", waste.estimated_weight.toString());
                                                                if (weight && !Number.isNaN(Number(weight))) {
                                                                    setActionLoading(true);
                                                                    const { confirmCollection } = await import("@/app/actions/collection");
                                                                    const result = await confirmCollection(waste.id, Number(weight));
                                                                    if (result.success) {
                                                                        showToast("Collecte validée et paiement effectué !", "success");
                                                                        navigateSafe(router, ROUTES.WALLET);
                                                                    } else {
                                                                        showToast(result.error || "Erreur lors de la validation", "error");
                                                                        setActionLoading(false);
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full py-5 bg-zinc-900 text-white font-black rounded-[2rem] flex items-center justify-center gap-3 uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl"
                                                        >
                                                            <Scan className="w-5 h-5" /> Scanner le QR Code
                                                        </button>
                                                        
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-px flex-1 bg-amber-200/50"></div>
                                                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">OU</span>
                                                            <div className="h-px flex-1 bg-amber-200/50"></div>
                                                        </div>
                                                    </div>

                                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">Saisir le Code PIN du vendeur</p>
                                                    <div className="flex gap-2 mb-6">
                                                        {[...Array(6)].map((_, i) => (
                                                            <input
                                                                key={i}
                                                                type="text"
                                                                id={`pin-${i}`}
                                                                maxLength={1}
                                                                className="w-full aspect-square bg-white dark:bg-zinc-800 border-2 border-amber-200 dark:border-zinc-700 rounded-xl text-center font-black text-lg text-amber-600 focus:border-primary outline-none transition-all uppercase"
                                                                onChange={async (e) => {
                                                                    const val = e.target.value.toUpperCase();
                                                                    e.target.value = val;
                                                                    if (val && i < 5) {
                                                                        const next = document.getElementById(`pin-${i + 1}`) as HTMLInputElement;
                                                                        next?.focus();
                                                                    }
                                                                    
                                                                    // Check if all 6 are filled
                                                                    const pin = Array.from({length: 6}, (_, idx) => (document.getElementById(`pin-${idx}`) as HTMLInputElement)?.value).join('');
                                                                    if (pin.length === 6) {
                                                                        const targetPin = waste.id.slice(0, 6).toUpperCase();
                                                                        if (pin === targetPin) {
                                                                            const weight = prompt("Confirmez le poids final en KG :", waste.estimated_weight.toString());
                                                                            if (weight && !Number.isNaN(Number(weight))) {
                                                                                setActionLoading(true);
                                                                                const { confirmCollection } = await import("@/app/actions/collection");
                                                                                const result = await confirmCollection(waste.id, Number(weight));
                                                                                if (result.success) {
                                                                                    showToast("Collecte validée et paiement effectué !", "success");
                                                                                    navigateSafe(router, ROUTES.WALLET);
                                                                                } else {
                                                                                    showToast(result.error || "Erreur lors de la validation", "error");
                                                                                    setActionLoading(false);
                                                                                }
                                                                            }
                                                                        } else {
                                                                            showToast("Code PIN erroné", "error");
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <button 
                                                        onClick={() => navigateSafe(router, ROUTES.CHAT, { wasteId: id })} 
                                                        className="w-full py-5 bg-gray-50 dark:bg-zinc-800 text-gray-500 font-black rounded-[2rem] hover:bg-gray-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
                                                    >
                                                        <MessageSquare className="w-4 h-4" /> Discuter avec le vendeur
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4 text-center">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 italic">Vous êtes le propriétaire</p>
                                {waste.status === 'collected' && (
                                    <button onClick={() => setShowRatingModal(true)} className="w-full mb-4 py-4 bg-amber-600 text-white font-black rounded-3xl hover:opacity-90 transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-amber-600/20">Noter le collecteur</button>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => showToast('Édition en cours de développement', 'success')} className="py-4 bg-zinc-900 text-white dark:bg-zinc-700 font-black rounded-3xl hover:opacity-90 transition-all uppercase tracking-widest text-[10px]">Modifier</button>
                                    <button onClick={() => showToast('Suppression en cours de développement', 'success')} className="py-4 bg-red-50 text-red-600 font-black rounded-3xl hover:bg-red-100 transition-all uppercase tracking-widest text-[10px]">Supprimer</button>
                                </div>
                            </div>
                        )}

                        <div className="mt-10 pt-10 border-t border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><ShieldCheck className="w-6 h-6" /></div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed tracking-wider">Garanti par <span className="text-primary font-black">CleanZone Protection</span>.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showRatingModal && (
                <RatingModal
                    wasteId={id}
                    reviewerId={currentUser?.id}
                    revieweeId={currentUser?.id === waste.seller_id ? waste.collector_id : waste.seller_id}
                    onClose={() => setShowRatingModal(false)}
                    onSuccess={() => {
                        showToast("Merci pour votre évaluation !", "success");
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}

export default function WasteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Chargement des détails...</p>
            </div>
        }>
            <WasteDetailsContent id={resolvedParams.id} />
        </Suspense>
    );
}
