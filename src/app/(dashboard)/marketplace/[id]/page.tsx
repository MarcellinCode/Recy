"use client";

import { useState, useEffect, useMemo, use } from "react";
import { ArrowLeft, MapPin, Calendar, Scale, Banknote, ShieldCheck, ShoppingBag, MessageSquare, Truck, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { RatingModal } from "@/components/ui/RatingModal";
import { showToast } from "@/components/ui/toast";

export default function WasteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);
    const view = searchParams.get("view") || "buyer";

    const [waste, setWaste] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showRatingModal, setShowRatingModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Get User
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUser(user);

                // Get Waste
                const { data, error: fetchError } = await supabase
                    .from('wastes')
                    .select('*, waste_types(name, emoji, price_per_kg), profiles!seller_id(full_name)')
                    .eq('id', id)
                    .single();

                if (fetchError) throw fetchError;
                setWaste(data);
            } catch (err: any) {
                console.error(err);
                setError("Impossible de charger les détails du lot.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, supabase]);

    const handleReserve = async () => {
        if (!currentUser) {
            router.push("/connexion");
            return;
        }

        setActionLoading(true);
        try {
            const { data, error: reserveError } = await supabase
                .from('wastes')
                .update({
                    status: 'reserved',
                    collector_id: currentUser.id
                })
                .eq('id', id)
                .select()
                .single();

            if (reserveError) throw reserveError;

            // Envoi d'une notification au vendeur
            await supabase.from('notifications').insert({
                profile_id: waste.seller_id,
                title: "Lot Réservé !",
                content: `Votre lot de ${waste.waste_types.name} a été réservé par un collecteur.`,
                type: 'offer'
            });

            if (!data || data.length === 0) {
                showToast("Erreur : La réservation n'a pas pu être effectuée.", "error");
                return;
            }

            showToast("Réservation réussie ! Redirection...", "success");

            // Re-fetch to clear cache/state
            router.refresh();

            // Small delay to let toast be seen
            setTimeout(() => {
                router.push("/chat");
            }, 1000);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erreur lors de la réservation.");
        } finally {
            setActionLoading(false);
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

    if (error || !waste) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-black text-gray-900 mb-4">Oups !</h1>
                <p className="text-gray-500 mb-8">{error || "Ce lot n'existe plus ou a déjà été retiré."}</p>
                <Link href="/marketplace" className="text-primary font-bold hover:underline">Retour au marché</Link>
            </div>
        );
    }

    const estimatedValue = Math.round(waste.estimated_weight * (waste.waste_types?.price_per_kg || 150));

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <Link href={view === "seller" ? "/mes-dechets" : "/marketplace"} className="inline-flex items-center gap-2 text-gray-400 hover:text-primary mb-10 transition-all font-black uppercase tracking-widest text-[10px]">
                <ArrowLeft className="w-4 h-4" />
                Détails du lot
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Column: Media & Info */}
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
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImageIndex(idx)}
                                        className={cn(
                                            "w-24 aspect-square rounded-2xl overflow-hidden border-4 transition-all",
                                            activeImageIndex === idx ? "border-primary scale-105 shadow-lg" : "border-white dark:border-zinc-800 opacity-60 hover:opacity-100"
                                        )}
                                    >
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
                                    <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tighter italic">
                                        {waste.waste_types?.name}
                                    </h1>
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-widest">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        Publié le {new Date(waste.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vendeur</p>
                                    <p className="font-black text-gray-900 dark:text-white uppercase">{waste.profiles?.full_name || "Anonyme"}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Informations Complémentaires</h2>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                                    {waste.description || "Aucune description supplémentaire fournie pour ce lot. Veuillez contacter le vendeur via le chat pour plus de précisions."}
                                </p>
                            </div>
                        </div>

                        <div className="bg-zinc-900 text-white rounded-[3rem] p-10 flex flex-col justify-between relative overflow-hidden group">
                            <div className="relative z-10">
                                <h2 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-8">Estimation Recy</h2>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Poids Brut</p>
                                        <p className="text-4xl font-black text-white">{waste.estimated_weight} <span className="text-sm font-bold opacity-30">kg</span></p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Gain Estimé</p>
                                        <p className="text-4xl font-black text-primary">{estimatedValue} <span className="text-sm font-bold opacity-30">CFA</span></p>
                                    </div>
                                </div>
                            </div>
                            <ShieldCheck className="absolute -bottom-10 -right-10 w-40 h-40 text-white/5 group-hover:rotate-12 transition-transform duration-700" />
                        </div>
                    </div>
                </div>

                {/* Right Column: Sticky Actions */}
                <div className="lg:col-span-12 xl:col-span-4 lg:sticky lg:top-24 h-fit">
                    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border-2 border-primary/10 p-10 shadow-2xl shadow-primary/5">
                        <div className="space-y-6 mb-10">
                            <div className="flex items-center gap-4 p-5 bg-gray-50 dark:bg-zinc-800 rounded-3xl">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <MapPin className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Lieu de collecte</p>
                                    <p className="font-black text-gray-900 dark:text-white truncate max-w-[180px] uppercase text-sm">{waste.location}</p>
                                </div>
                            </div>
                        </div>

                        {view === "buyer" ? (
                            <div className="space-y-4">
                                {waste.status === 'published' ? (
                                    <>
                                        <button
                                            onClick={handleReserve}
                                            disabled={actionLoading}
                                            className="w-full py-6 bg-primary text-white font-black rounded-3xl shadow-2xl shadow-primary/30 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-70"
                                        >
                                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
                                            {actionLoading ? "Réservation..." : "Réserver la collecte"}
                                        </button>
                                        <Link
                                            href={`/chat?wasteId=${id}`}
                                            className="w-full py-6 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white font-black rounded-3xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                            Discuter avec le vendeur
                                        </Link>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-8 bg-amber-50 dark:bg-amber-950/20 rounded-[2rem] border border-amber-100 dark:border-amber-900/30 text-center">
                                            <p className="font-black text-amber-900 dark:text-amber-400 uppercase text-xs mb-1">
                                                {waste.status === 'reserved' ? "Déjà réservé" : "Collecté"}
                                            </p>
                                            <p className="text-amber-700/70 dark:text-amber-500/70 text-[10px] font-bold uppercase tracking-wider">
                                                {waste.status === 'reserved'
                                                    ? "Ce lot est en cours de traitement."
                                                    : "Ce lot a été collecté avec succès."}
                                            </p>
                                            {waste.status === 'collected' && (
                                                <button
                                                    onClick={() => setShowRatingModal(true)}
                                                    className="mt-4 px-6 py-2 bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-600/20"
                                                >
                                                    Donner mon avis
                                                </button>
                                            )}
                                        </div>
                                        {(currentUser?.id === waste.collector_id) && (
                                            <Link
                                                href={`/chat?wasteId=${id}`}
                                                className="w-full py-6 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                Discussion en cours
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4 text-center">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 italic">Vous êtes le propriétaire</p>
                                {waste.status === 'collected' && (
                                    <button
                                        onClick={() => setShowRatingModal(true)}
                                        className="w-full mb-4 py-4 bg-amber-600 text-white font-black rounded-3xl hover:opacity-90 transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-amber-600/20"
                                    >
                                        Noter le collecteur
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <button className="py-4 bg-zinc-900 text-white dark:bg-zinc-700 font-black rounded-3xl hover:opacity-90 transition-all uppercase tracking-widest text-[10px]">
                                        Modifier
                                    </button>
                                    <button className="py-4 bg-red-50 text-red-600 font-black rounded-3xl hover:bg-red-100 transition-all uppercase tracking-widest text-[10px]">
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-10 pt-10 border-t border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed tracking-wider">
                                    Garanti par <span className="text-primary font-black">Recy Protection</span>.
                                </div>
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
