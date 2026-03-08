"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Camera, Upload, MapPin, Info, Loader2, CheckCircle2, X, Navigation } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { uploadImage } from "@/app/actions/cloudinary";

export default function PublishWastePage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        type_id: "",
        estimated_weight: "",
        location: "",
        latitude: null as number | null,
        longitude: null as number | null,
    });
    const [geoLoading, setGeoLoading] = useState(false);

    const [images, setImages] = useState<{ file: File; preview: string }[]>([]);

    const categories = [
        { id: "1", label: "Plastique HDPE", icon: "🥤" },
        { id: "2", label: "Aluminium", icon: "🥫" },
        { id: "3", label: "Papier / Carton", icon: "📦" },
        { id: "4", label: "Verre", icon: "🍾" },
        { id: "5", label: "Métal / Feraille", icon: "⛓️" },
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && images.length < 3) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, { file, preview: reader.result as string }]);
            };
            reader.readAsDataURL(file);
        }
        // Reset input value to allow selecting same file if deleted
        e.target.value = "";
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("La géolocalisation n'est pas supportée par votre navigateur.");
            return;
        }

        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setFormData(prev => ({ ...prev, latitude, longitude }));

            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
                const data = await response.json();

                if (data.display_name) {
                    // Extract a more concise location name
                    const address = data.address;
                    const displayLocation = address.city || address.town || address.village || address.suburb || data.display_name.split(',')[0];
                    setFormData(prev => ({ ...prev, location: displayLocation }));
                }
            } catch (err) {
                console.error("Reverse geocoding error:", err);
            } finally {
                setGeoLoading(false);
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            alert("Impossible de récupérer votre position.");
            setGeoLoading(false);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.type_id) {
            setError("Veuillez sélectionner une catégorie.");
            return;
        }

        if (images.length === 0) {
            setError("Veuillez ajouter au moins une photo du lot.");
            return;
        }

        setLoading(true);

        try {
            // 1. Get current user & profile
            const { data: { user } = {} } = await supabase.auth.getUser();
            if (!user) throw new Error("Vous devez être connecté pour publier.");

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role === 'collecteur') {
                throw new Error("Désolé, seuls les vendeurs peuvent publier des lots.");
            }

            const image_urls: string[] = [];

            // 2. Upload images to Cloudinary
            for (const img of images) {
                const { url } = await uploadImage(img.preview);
                image_urls.push(url);
            }

            // 3. Insert into DB
            const { error: insertError } = await supabase
                .from('wastes')
                .insert({
                    seller_id: user.id,
                    type_id: parseInt(formData.type_id),
                    estimated_weight: parseFloat(formData.estimated_weight),
                    location: formData.location,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    images: image_urls,
                    status: 'published'
                });

            if (insertError) throw insertError;

            setSuccess(true);
            setTimeout(() => {
                router.push("/mes-dechets");
            }, 2000);

        } catch (err: any) {
            console.error("Publication error full details:", err);
            if (err.code) {
                console.error("Supabase Error Code:", err.code);
                console.error("Supabase Error Message:", err.message);
                console.error("Supabase Error Details:", err.details);
                console.error("Supabase Error Hint:", err.hint);
            }
            setError(err.message || "Une erreur est survenue lors de la publication.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-20 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tight">Annonce Publiée !</h1>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">Votre lot est maintenant visible par les collecteurs sur le marché.</p>
                <Link href="/mes-dechets" className="text-primary font-bold hover:underline">
                    Retourner à mes déchets
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <Link href="/mes-dechets" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Retour à mes déchets
            </Link>

            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-100 dark:shadow-none p-6 sm:p-10">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Publier un lot</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">Capturez et décrivez vos recyclables pour attirer un collecteur.</p>

                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl font-bold italic">
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-10">
                    {/* Photos */}
                    <div>
                        <label className="block text-xs font-black text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-[0.2em]">Photos du lot (Max 3)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {images.map((img, index) => (
                                <div key={index} className="relative aspect-square rounded-[2rem] overflow-hidden group shadow-lg border border-gray-100 dark:border-zinc-800">
                                    <img src={img.preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-black text-[10px] uppercase gap-1"
                                    >
                                        <X className="w-5 h-5" />
                                        Supprimer
                                    </button>
                                </div>
                            ))}

                            {images.length < 3 && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                        <Camera className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center px-2">
                                        {images.length === 0 ? "Ajouter Photo" : "Photo Suivante"}
                                    </span>
                                </button>
                            )}

                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div>
                        <label className="block text-xs font-black text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-[0.2em]">Catégorie de déchet</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type_id: cat.id })}
                                    className={cn(
                                        "p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center text-center gap-3 active:scale-95",
                                        formData.type_id === cat.id
                                            ? "border-primary bg-primary/5 shadow-inner"
                                            : "border-gray-50 dark:border-zinc-900 bg-gray-50/50 dark:bg-zinc-800/30 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    <span className="text-3xl drop-shadow-sm">{cat.icon}</span>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        formData.type_id === cat.id ? "text-primary" : "text-gray-500 dark:text-gray-400"
                                    )}>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-xs font-black text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-[0.2em]">Poids Estimé (kg)</label>
                            <input
                                type="number"
                                step="any"
                                required
                                value={formData.estimated_weight}
                                onChange={(e) => setFormData({ ...formData, estimated_weight: e.target.value })}
                                placeholder="0.00"
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white font-black"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-[0.2em]">Ville / Quartier</label>
                            <div className="relative">
                                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Ex: Abidjan, Cocody"
                                    className="w-full pl-14 pr-14 py-4 bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white font-black"
                                />
                                <button
                                    type="button"
                                    onClick={handleGetLocation}
                                    disabled={geoLoading}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-zinc-700 rounded-xl shadow-sm hover:text-primary transition-colors disabled:opacity-50"
                                    title="Position automatique"
                                >
                                    {geoLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Navigation className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50/50 dark:bg-amber-950/10 p-6 rounded-3xl flex gap-4 items-start border border-amber-100/50 dark:border-amber-900/20">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                            <Info className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-xs text-amber-800/80 dark:text-amber-400/80 leading-relaxed font-bold italic">
                            Les tarifs sont basés sur le cours actuel du marché. Le montant définitif vous sera versé après pesée officielle par le collecteur sur place.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-6 bg-primary text-white font-black rounded-3xl shadow-2xl shadow-primary/30 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all text-xl uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <Upload className="w-6 h-6" />
                        )}
                        {loading ? "Chargement..." : "Publier l'Annonce"}
                    </button>
                </form>
            </div>
        </div>
    );
}
