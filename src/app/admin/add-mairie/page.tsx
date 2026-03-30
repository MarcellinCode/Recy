"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
    Landmark, 
    ShieldCheck, 
    Mail, 
    Lock, 
    Phone, 
    ChevronLeft, 
    Loader2, 
    MapPin, 
    ArrowRight,
    Building2,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { createMairieAccount } from "@/app/actions/admin-mairie";
import { showToast } from "@/components/ui/toast";

export default function AddMairiePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        municipalityName: "",
        officialDepartment: "",
        email: "",
        password: "",
        phone: "",
        city: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await createMairieAccount(formData);
            if (res.success) {
                setSuccess(true);
                showToast("Mairie créée avec succès !");
                setTimeout(() => {
                    router.push("/admin/organizations");
                }, 2000);
            } else {
                showToast(res.error || "Erreur lors de la création", "error");
            }
        } catch (error) {
            showToast("Une erreur critique est survenue", "error");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle2 size={40} />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Provisionnement Réussi</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-2">La mairie a été ajoutée à l'écosystème City O.S.</p>
                </div>
                <Loader2 className="w-6 h-6 animate-spin text-primary mt-4" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-10 flex items-center justify-between">
                <div>
                    <Link 
                        href="/admin/organizations" 
                        className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors mb-4"
                    >
                        <ChevronLeft size={16} />
                        Retour aux Organisations
                    </Link>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">
                        Provisionner une <span className="text-primary italic tracking-tighter">Nouvelle Mairie</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2 italic">Création directe de compte institutionnel premium</p>
                </div>
                <div className="hidden md:flex w-16 h-16 bg-primary/10 rounded-2xl items-center justify-center text-primary border border-primary/20">
                    <Landmark size={32} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Section Identification */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 size={20} className="text-primary" />
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest italic">Identification de la Commune</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom de la Mairie / Commune</label>
                            <input
                                required
                                value={formData.municipalityName}
                                onChange={(e) => setFormData({...formData, municipalityName: e.target.value})}
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all font-bold"
                                placeholder="EX: MAIRIE DE COCODY"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Département ou Direction</label>
                            <input
                                required
                                value={formData.officialDepartment}
                                onChange={(e) => setFormData({...formData, officialDepartment: e.target.value})}
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all"
                                placeholder="Direction de l'Environnement"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Ville / Zone d'Opération</label>
                            <div className="relative">
                                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input
                                    required
                                    value={formData.city}
                                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                                    className="w-full pl-14 pr-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all"
                                    placeholder="Abidjan"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section Accès & Sécurité */}
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl space-y-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck size={20} className="text-primary" />
                        <h2 className="text-sm font-black text-white uppercase tracking-widest italic">Accès & Sécurité Authentifiée</h2>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Email Officiel (.gouv / .ci)</label>
                                <div className="relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full pl-14 pr-6 py-4 bg-black/40 border border-zinc-800 focus:border-primary rounded-2xl text-sm outline-none text-white transition-all font-medium"
                                        placeholder="admin@commune.gouv.ci"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Mot de Passe Initial</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        className="w-full pl-14 pr-6 py-4 bg-black/40 border border-zinc-800 focus:border-primary rounded-2xl text-sm outline-none text-white transition-all font-medium tracking-widest"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <p className="text-[9px] text-zinc-600 italic px-4 mt-2">Ce mot de passe sera communiqué au Maire/Référent.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Contact Téléphonique Direct</label>
                                <div className="relative">
                                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="w-full pl-14 pr-6 py-4 bg-black/40 border border-zinc-800 focus:border-primary rounded-2xl text-sm outline-none text-white transition-all font-medium"
                                        placeholder="+225 00 00 00 00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.15em] leading-relaxed">
                                <ShieldCheck size={12} className="inline mr-2" />
                                NOTE: L'activation de la licence "City O.S. Mairie Elite" sera automatique à la création.
                            </p>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-primary text-white hover:bg-primary/90 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 mt-4 group"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>Initier l'Institution <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
