"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, MapPin, Calendar, Scale, Banknote, ShieldCheck, ShoppingBag, MessageSquare, Truck, Loader2, CheckCircle2, Trash2, CheckCircle } from "lucide-react";
import { confirmCollection } from "@/app/actions/collection";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function SellerWasteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const supabase = createClient();

    const [waste, setWaste] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [finalWeight, setFinalWeight] = useState<string>("");

    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Get User
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUser(user);

                const { data, error: fetchError } = await supabase
                    .from('wastes')
                    .select('*, waste_types(name, emoji, price_per_kg), collector:profiles!collector_id(full_name)')
                    .eq('id', id)
                    .single();

                if (fetchError) throw fetchError;
                setWaste(data);
                if (data) setFinalWeight(data.estimated_weight.toString());
            } catch (err: any) {
                console.error(err);
                setError("Impossible de charger les détails de votre lot.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, supabase]);

    const handleDelete = async () => {
        if (!confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;

        setActionLoading(true);
        try {
            const { error: deleteError } = await supabase
                .from('wastes')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            router.push("/mes-dechets");
        } catch (err: any) {
            console.error(err);
            alert("Erreur lors de la suppression.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmCollection = async () => {
        if (!finalWeight || isNaN(Number(finalWeight))) {
            alert("Veuillez saisir un poids valide.");
            return;
        }

        if (!confirm(`Confirmer la collecte de ${finalWeight} kg ? Un transfert de fonds sera effectué.`)) return;

        setActionLoading(true);
        try {
            const result = await confirmCollection(id, Number(finalWeight));
            if (result.success) {
                alert("Collecte confirmée avec succès ! Les fonds ont été transférés.");
                router.refresh(); // Refresh page
                // Reload waste data manually to be sure
                const { data } = await supabase
                    .from('wastes')
                    .select('*, waste_types(name, emoji, price_per_kg), collector:profiles!collector_id(full_name)')
                    .eq('id', id)
                    .single();
                setWaste(data);
            } else {
                alert("Erreur : " + result.error);
            }
        } catch (err: any) {
            console.error(err);
            alert("Une erreur imprévue est survenue.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Chargement de votre lot...</p>
            </div>
        );
    }

    if (error || !waste) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-black text-gray-900 mb-4">Oups !</h1>
                <p className="text-gray-500 mb-8">{error || "Ce lot n'existe plus."}</p>
                <Link href="/mes-dechets" className="text-primary font-bold hover:underline">Retour à mes déchets</Link>
            </div>
        );
    }

    const estimatedValue = Math.round(waste.estimated_weight * (waste.waste_types?.price_per_kg || 150));

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <Link href="/mes-dechets" className="inline-flex items-center gap-2 text-gray-400 hover:text-primary mb-10 transition-all font-black uppercase tracking-widest text-[10px]">
                <ArrowLeft className="w-4 h-4" />
                Détails de mon annonce
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Column */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="space-y-4">
                        <div className="aspect-[21/9] bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border-4 border-white dark:border-zinc-800 shadow-2xl overflow-hidden relative group">
                            {waste.images && waste.images.length > 0 ? (
                                <img src={waste.images[activeImageIndex]} alt={waste.waste_types?.name} className="w-full h-full object-cover" />
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
                                    {waste.status === 'published' ? 'En ligne' : waste.status === 'reserved' ? 'Réservé' : 'Collecté'}
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

                    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tighter italic">
                            {waste.waste_types?.name}
                        </h1>
                        <div className="grid grid-cols-2 gap-8 mb-10">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Poids Déclaré</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{waste.estimated_weight} kg</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date de publication</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{new Date(waste.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Description</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                                {waste.description || "Aucune description fournie."}
                            </p>
                        </div>
                    </div>

                    {waste.status === 'reserved' && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-[3rem] p-10 border-2 border-amber-100 dark:border-amber-900/20 flex flex-col gap-8">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="w-20 h-20 rounded-[2rem] bg-amber-200/50 flex items-center justify-center text-amber-600 shrink-0">
                                    <Truck className="w-10 h-10 shadow-lg" />
                                </div>
                                <div className="text-center md:text-left">
                                    <h3 className="text-xl font-black text-amber-900 dark:text-amber-400 uppercase italic mb-1">
                                        {currentUser?.id === waste.collector_id ? "Saisie de la pesée" : "Confirmation de Collecte"}
                                    </h3>
                                    <p className="text-amber-700/70 dark:text-amber-500/70 font-medium">
                                        {currentUser?.id === waste.collector_id
                                            ? "Vous avez réservé ce lot. Saisissez le poids réel ou scannez le QR code du vendeur."
                                            : `Le collecteur ${waste.collector?.full_name} est en route. Présentez-lui ce code lors du rendez-vous.`}
                                    </p>
                                </div>
                            </div>

                            {currentUser?.id === waste.seller_id && (
                                <div className="flex flex-col items-center gap-8 py-4">
                                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] shadow-2xl border-4 border-white dark:border-zinc-800 relative group">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=WAVE-${waste.id.slice(0, 8)}`} 
                                            alt="Collection QR Code"
                                            className="w-48 h-48 md:w-64 md:h-64 rounded-2xl"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Scannez pour valider</p>
                                        </div>
                                    </div>
                                    <div className="text-center space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Ou donnez ce Code PIN</p>
                                        <div className="flex gap-2">
                                            {waste.id.slice(0, 6).toUpperCase().split('').map((char: string, i: number) => (
                                                <div key={i} className="w-10 h-14 bg-white dark:bg-zinc-800 rounded-xl border-2 border-amber-200 dark:border-zinc-700 flex items-center justify-center text-xl font-black text-amber-600">
                                                    {char}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentUser?.id === waste.collector_id && (
                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-xl border border-amber-200 dark:border-zinc-800 space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Poids Réel Constaté (kg)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={finalWeight}
                                                onChange={(e) => setFinalWeight(e.target.value)}
                                                className="w-full text-4xl font-black p-6 bg-gray-50 dark:bg-zinc-800 rounded-3xl border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all text-gray-900 dark:text-white"
                                                placeholder={waste.estimated_weight.toString()}
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xl">KG</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleConfirmCollection}
                                        disabled={actionLoading}
                                        className="w-full py-6 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
                                    >
                                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                        Finaliser & Payer le vendeur
                                    </button>
                                </div>
                            )}

                            <Link href={`/chat?wasteId=${id}`} className="inline-flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-widest hover:underline justify-center md:justify-start">
                                <MessageSquare className="w-4 h-4" />
                                Ouvrir la discussion
                            </Link>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-zinc-900 text-white rounded-[3rem] p-10 shadow-xl relative overflow-hidden group">
                        <h2 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-8">Résumé Financier</h2>
                        <div className="space-y-6 relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Gain Potentiel</p>
                                <p className="text-4xl font-black text-primary italic">~{estimatedValue} <span className="text-sm font-bold opacity-30">CFA</span></p>
                            </div>
                            <div className="pt-6 border-t border-white/10">
                                <p className="text-[9px] text-gray-400 font-medium leading-relaxed italic">
                                    Le montant exact sera calculé lors de la pesée finale par le collecteur sur place.
                                </p>
                            </div>
                        </div>
                        <Banknote className="absolute -bottom-10 -right-10 w-40 h-40 text-white/5 group-hover:rotate-12 transition-transform duration-700" />
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-4">Gestion de l'annonce</p>
                        <button className="w-full py-4 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white font-black rounded-3xl hover:bg-gray-100 transition-all uppercase tracking-widest text-[10px]">
                            Modifier l'annonce
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={actionLoading}
                            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-3xl hover:bg-red-100 transition-all uppercase tracking-widest text-[10px] disabled:opacity-50"
                        >
                            {actionLoading ? "Suppression..." : "Supprimer définitivement"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
