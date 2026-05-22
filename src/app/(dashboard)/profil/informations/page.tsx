"use client";

import { useState, useEffect } from "react";
import { UserCircle, ArrowLeft, Loader2, Save, Mail, MapPin, User, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { userService } from "@/services/userService";
import { showToast } from "@/components/ui/toast";
import { uploadImage } from "@/app/actions/cloudinary";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export default function ProfileInfosPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        city: "",
        email: "",
        avatar_url: ""
    });

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const data = await userService.getCurrentProfile();
                if (data) {
                    setFormData({
                        full_name: data.full_name || "",
                        city: data.city || "",
                        email: data.email || "",
                        avatar_url: data.avatar_url || ""
                    });
                }
            } catch (error) {
                console.error(error);
                showToast("Erreur de chargement", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const res = await uploadImage(reader.result as string);
                if (res.success && res.url) {
                    setFormData(prev => ({ ...prev, avatar_url: res.url! }));
                    showToast("Photo de profil mise à jour localement", "success");
                } else {
                    showToast(res.error || "Échec de l'envoi", "error");
                }
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await userService.updateProfile({
                full_name: formData.full_name,
                city: formData.city,
                avatar_url: formData.avatar_url
            });
            showToast("Profil mis à jour !", "success");
            router.push(ROUTES.PROFILE);
        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Erreur lors de la mise à jour", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-10">
            <Link href={ROUTES.PROFILE} className="inline-flex items-center gap-2 text-gray-400 hover:text-primary mb-10 transition-all font-black uppercase tracking-widest text-[10px]">
                <ArrowLeft className="w-4 h-4" />
                Retour au profil
            </Link>

            <div className="mb-12">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-4 mb-2 tracking-tighter uppercase italic">
                    <UserCircle className="w-10 h-10 text-primary" />
                    Mes <span className="text-primary">Informations</span>
                </h1>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest pl-14">
                    Gérez votre identité numérique CITICLINE
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border-2 border-gray-100 dark:border-zinc-800 shadow-xl space-y-8">
                {/* Avatar Update Section */}
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-[2rem] bg-gray-50 dark:bg-zinc-800 overflow-hidden border-2 border-gray-100 dark:border-zinc-700 shadow-inner flex items-center justify-center">
                            {formData.avatar_url ? (
                                <Image src={formData.avatar_url} alt="Avatar" fill className="object-cover" />
                            ) : (
                                <UserCircle className="w-12 h-12 text-gray-200" />
                            )}
                            {uploading && (
                                <div className="absolute inset-0 bg-white/60 dark:bg-black/60 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                            )}
                        </div>
                        <label 
                            htmlFor="avatar-file"
                            className={cn(
                                "absolute -bottom-2 -right-2 bg-zinc-900 text-white p-2 rounded-xl cursor-pointer hover:bg-primary transition-all shadow-lg border-2 border-white dark:border-zinc-800",
                                uploading && "opacity-50 pointer-events-none"
                            )}
                        >
                            <Camera className="w-4 h-4" />
                            <input 
                                id="avatar-file"
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleAvatarChange}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mt-2">
                        {uploading ? "Chargement..." : "Photo de profil"}
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Nom Complet */}
                    <div className="space-y-3">
                        <label htmlFor="fullName" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <User className="w-3 h-3" /> Nom et Prénom
                        </label>
                        <input
                            id="fullName"
                            type="text"
                            required
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full p-6 bg-gray-50 dark:bg-zinc-800 border-none rounded-3xl outline-none focus:ring-4 focus:ring-primary/10 text-sm font-bold transition-all"
                            placeholder="Ex: Jean Kouamé"
                        />
                    </div>

                    {/* Ville */}
                    <div className="space-y-3">
                        <label htmlFor="city" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Ville de résidence
                        </label>
                        <input
                            id="city"
                            type="text"
                            required
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full p-6 bg-gray-50 dark:bg-zinc-800 border-none rounded-3xl outline-none focus:ring-4 focus:ring-primary/10 text-sm font-bold transition-all"
                            placeholder="Ex: Abidjan, Cotonou..."
                        />
                    </div>

                    {/* Email (Readonly) */}
                    <div className="space-y-3 opacity-60">
                        <label htmlFor="email" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Mail className="w-3 h-3" /> Adresse Email (non modifiable)
                        </label>
                        <input
                            id="email"
                            type="email"
                            readOnly
                            value={formData.email}
                            className="w-full p-6 bg-gray-100 dark:bg-zinc-800 border-none rounded-3xl outline-none text-sm font-bold cursor-not-allowed"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-6 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 disabled:opacity-70"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Enregistrer les modifications
                </button>
            </form>
        </div>
    );
}
