"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf, User, Truck, ArrowRight, Loader2, Building2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [role, setRole] = useState<"vendeur" | "collecteur" | "entreprise" | "organisation_admin" | "mairie" | null>(null);
    const [step, setStep] = useState(1); // 1: Choose Role, 2: Specific Info, 3: Account Info

    useEffect(() => {
        const urlRole = searchParams.get("role");
        const token = searchParams.get("token");
        const type = searchParams.get("type");

        if (type === "official" && token) {
            setRole("mairie");
            setStep(2);
        } else if (urlRole === "citoyen" || urlRole === "citizen" || urlRole === "vendeur") {
            setRole("vendeur");
        } else if (urlRole === "collecteur" || urlRole === "collector") {
            setRole("collecteur");
        }
    }, [searchParams]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        // Common
        email: "",
        password: "",
        fullName: "",
        phone: "",
        // Citizen
        district: "",
        // Collector
        vehicleType: "",
        idNumber: "",
        // Organisation
        orgName: "",
        contactPerson: "",
        rccm: "",
        agentCount: "",
        // Mairie
        municipalityName: "",
        officialDepartment: "",
    });

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!role) return;

        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: role === 'mairie' ? formData.municipalityName : (role === 'organisation_admin' ? formData.orgName : formData.fullName),
                        role: role,
                        phone: formData.phone,
                        // Role specific metadata
                        district: formData.district,
                        vehicle_type: formData.vehicleType,
                        id_number: formData.idNumber,
                        rccm: formData.rccm,
                        contact_person: formData.contactPerson,
                        agent_count: formData.agentCount,
                        official_department: formData.officialDepartment
                    },
                },
            });

            if (authError) throw authError;

            router.push("/connexion?message=Vérifiez votre email pour confirmer l'inscription");
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de l'inscription.");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        // Validation basique avant de passer à l'étape suivante
        if (step === 2) {
            if (role === 'vendeur' && (!formData.fullName || !formData.phone || !formData.district)) {
                setError("Veuillez remplir tous les champs.");
                return;
            }
            if (role === 'collecteur' && (!formData.fullName || !formData.phone || !formData.vehicleType || !formData.idNumber)) {
                setError("Veuillez remplir tous les champs.");
                return;
            }
            if (role === 'organisation_admin' && (!formData.orgName || !formData.contactPerson || !formData.rccm || !formData.phone)) {
                setError("Veuillez remplir tous les champs.");
                return;
            }
            if (role === 'mairie' && (!formData.municipalityName || !formData.officialDepartment || !formData.phone)) {
                setError("Veuillez remplir tous les champs.");
                return;
            }
        }
        setError(null);
        setStep(prev => prev + 1);
    };
    
    const prevStep = () => setStep(prev => prev - 1);

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
            <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl shadow-gray-100 dark:bg-zinc-900 dark:shadow-none border border-gray-100 dark:border-zinc-800">
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-primary/10 text-primary">
                        <Leaf className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {step === 1 ? "Créer un compte" : step === 2 ? "Informations Profil" : "Compte de Connexion"}
                    </h2>
                    <p className="mt-2 text-sm text-center text-gray-500 dark:text-gray-400">
                        {step === 1 ? "Rejoignez l'aventure WaveClean" : "Presque terminé !"}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center uppercase tracking-widest">Vous êtes :</p>

                        <button
                            onClick={() => { setRole("vendeur"); setStep(2); }}
                            className="flex items-center w-full p-4 transition-all border-2 rounded-2xl border-gray-100 hover:border-emerald-500 hover:bg-emerald-500/5 group text-left dark:border-zinc-800"
                        >
                            <div className="flex items-center justify-center w-10 h-10 mr-4 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase">Citoyen (Foyer)</h3>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Je vends mes déchets & je gère mes ordures.</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500" />
                        </button>

                        <button
                            onClick={() => { setRole("collecteur"); setStep(2); }}
                            className="flex items-center w-full p-4 transition-all border-2 rounded-2xl border-gray-100 hover:border-amber-500 hover:bg-amber-500/5 group text-left dark:border-zinc-800"
                        >
                            <div className="flex items-center justify-center w-10 h-10 mr-4 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30">
                                <Truck className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase">Collecteur Indépendant</h3>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Je souhaite acheter des lots recyclables.</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500" />
                        </button>

                        <button
                            onClick={() => { setRole("organisation_admin"); setStep(2); }}
                            className="flex items-center w-full p-4 transition-all border-2 rounded-2xl border-gray-100 hover:border-indigo-500 hover:bg-indigo-500/5 group text-left dark:border-zinc-800"
                        >
                            <div className="flex items-center justify-center w-10 h-10 mr-4 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase">Organisation</h3>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Je gère une zone et ma flotte d'agents.</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                        </button>

                        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-zinc-800 text-center">
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Accès Officiel Mairie</p>
                             <p className="text-[9px] text-gray-500 mt-1 uppercase italic px-4">L'inscription Mairie se fait exclusivement via lien d'invitation sécurisé.</p>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1">
                             {/* Specific Fields */}
                             {role === "vendeur" && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nom Complet</label>
                                        <input
                                            type="text"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Ex: Jean Kouamé"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Numéro de Téléphone</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="+225 00 00 00 00"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quartier / Adresse</label>
                                        <input
                                            type="text"
                                            value={formData.district}
                                            onChange={(e) => setFormData({...formData, district: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Ex: Cocody Angré"
                                        />
                                    </div>
                                </>
                             )}

                             {role === "collecteur" && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nom Complet</label>
                                        <input
                                            type="text"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Nom et prénoms"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Numéro de Téléphone</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="+225..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Type de Véhicule</label>
                                        <select
                                            value={formData.vehicleType}
                                            onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                        >
                                            <option value="">Sélectionnez</option>
                                            <option value="charette">Charette</option>
                                            <option value="tricycle">Tricycle</option>
                                            <option value="camionnette">Camionnette</option>
                                            <option value="camion">Camion de Collecte</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">N° Pièce d'Identité (CNI/Passport)</label>
                                        <input
                                            type="text"
                                            value={formData.idNumber}
                                            onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Numéro officiel"
                                        />
                                    </div>
                                </>
                             )}

                             {role === "organisation_admin" && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nom de l'Organisation</label>
                                        <input
                                            type="text"
                                            value={formData.orgName}
                                            onChange={(e) => setFormData({...formData, orgName: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Nom entreprise / ONG"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nom du Responsable</label>
                                        <input
                                            type="text"
                                            value={formData.contactPerson}
                                            onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Directeur / Gérant"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Numéro RCCM / IFU</label>
                                        <input
                                            type="text"
                                            value={formData.rccm}
                                            onChange={(e) => setFormData({...formData, rccm: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Enregistrement légal"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Téléphone Siège</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="+225..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nombre d'Agents Estimé</label>
                                        <input
                                            type="number"
                                            value={formData.agentCount}
                                            onChange={(e) => setFormData({...formData, agentCount: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Ex: 10"
                                        />
                                    </div>
                                </>
                             )}

                             {role === "mairie" && (
                                <>
                                     <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                                         <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                         <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-tight italic">Inscription Officielle Validée</p>
                                     </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nom de la Commune</label>
                                        <input
                                            type="text"
                                            value={formData.municipalityName}
                                            onChange={(e) => setFormData({...formData, municipalityName: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Ex: Mairie de Cocody"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Service / Direction Référent</label>
                                        <input
                                            type="text"
                                            value={formData.officialDepartment}
                                            onChange={(e) => setFormData({...formData, officialDepartment: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Ex: Direction de la Salubrité"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Téléphone Administrateur</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="+225..."
                                        />
                                    </div>
                                </>
                             )}
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-gray-50 dark:border-zinc-800">
                            <button onClick={prevStep} className="flex-1 py-4 text-xs font-black uppercase tracking-widest border border-gray-100 rounded-2xl hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-white transition-all">Retour</button>
                            <button onClick={nextStep} className="flex-[2] py-4 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Continuer</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email {role === 'mairie' ? 'Officiel' : 'Personnel'}</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                    placeholder="email@exemple.com"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mot de passe</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-gray-50 dark:border-zinc-800">
                            <button type="button" onClick={prevStep} className="flex-1 py-4 text-xs font-black uppercase tracking-widest border border-gray-100 rounded-2xl hover:bg-gray-50 dark:border-zinc-800 transition-all dark:text-white">Retour</button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] py-4 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                                Finaliser mon compte
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-8 text-center pt-6 border-t border-gray-50 dark:border-zinc-800">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                        Vous avez déjà un compte ?{" "}
                        <Link href="/connexion" className="text-primary hover:underline">
                            Connectez-vous
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function Signup() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <SignupForm />
        </Suspense>
    );
}
