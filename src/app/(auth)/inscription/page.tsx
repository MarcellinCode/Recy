"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Truck, ArrowRight, Loader2, Building2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { validateInvitation, consumeInvitation } from "@/app/actions/invitations";

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
            validateInvitation(token).then((res) => {
                if (res.valid) {
                    setRole("mairie");
                    setStep(2);
                } else {
                    setError("Le lien d'invitation est invalide ou expiré.");
                }
            });
        } else if (urlRole === "citoyen" || urlRole === "citizen" || urlRole === "vendeur") {
            setRole("vendeur");
        } else if (urlRole === "collecteur" || urlRole === "collector") {
            setRole("collecteur");
        }
    }, [searchParams]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zones, setZones] = useState<any[]>([]);

    useEffect(() => {
        const fetchZones = async () => {
            try {
                const { data } = await supabase.from('zones').select('id, name');
                if (data) setZones(data);
            } catch (e) {
                console.error("Error loading zones:", e);
            }
        };
        fetchZones();
    }, [supabase]);

    const [formData, setFormData] = useState({
        // Common
        email: "",
        password: "",
        fullName: "",
        phone: "",
        city: "",
        zoneId: "",
        commune: "",
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

        try {            let fullName = formData.fullName;
            if (role === 'mairie') fullName = formData.municipalityName;
            else if (role === 'organisation_admin' || role === 'entreprise') fullName = formData.orgName;
 
            const { data, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        phone: formData.phone,
                        city: formData.city,
                        zone_id: formData.zoneId || null,
                        // Role specific metadata
                        district: formData.district,
                        municipality_name: formData.commune,
                        vehicle_type: formData.vehicleType,
                        id_number: formData.idNumber,
                        rccm: formData.rccm,
                        contact_person: formData.contactPerson,
                        agent_count: formData.agentCount,
                        official_department: formData.officialDepartment
                    },
                },
            });;

            if (authError) throw authError;
            
            // Consume the invitation token if role is mairie
            if (role === 'mairie') {
                const token = searchParams.get("token");
                if (token && data.user) {
                    await consumeInvitation(token, data.user.id);
                }
            }

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
            if (role === 'vendeur' && (!formData.fullName || !formData.phone || !formData.district || !formData.city)) {
                setError("Veuillez remplir tous les champs (y compris la ville).");
                return;
            }
            if (role === 'collecteur' && (!formData.fullName || !formData.phone || !formData.vehicleType || !formData.idNumber || !formData.city)) {
                setError("Veuillez remplir tous les champs (y compris la ville).");
                return;
            }
            if ((role === 'organisation_admin' || role === 'entreprise') && (!formData.orgName || !formData.contactPerson || !formData.rccm || !formData.phone || !formData.city || !formData.district || !formData.commune)) {
                setError("Veuillez remplir tous les champs (y compris la ville, le district et la commune).");
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
                    <div className="flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-white border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 shadow-md overflow-hidden shrink-0">
                        <img src="/logo.png" alt="CITICLINE Logo" className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {step === 1 ? "Créer un compte" : step === 2 ? "Informations Profil" : "Compte de Connexion"}
                    </h2>
                    <p className="mt-2 text-sm text-center text-gray-500 dark:text-gray-400">
                        {step === 1 ? "Rejoignez l'aventure CITICLINE" : "Presque terminé !"}
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
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase">Organisation / ONG</h3>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Je gère une zone d'intérêt public sans but lucratif.</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                        </button>
 
                        <button
                            onClick={() => { setRole("entreprise"); setStep(2); }}
                            className="flex items-center w-full p-4 transition-all border-2 rounded-2xl border-gray-100 hover:border-blue-500 hover:bg-blue-500/5 group text-left dark:border-zinc-800"
                        >
                            <div className="flex items-center justify-center w-10 h-10 mr-4 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase">Entreprise Privée</h3>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Société de collecte, tri et recyclage commerciale.</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
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
                                        <label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nom Complet</label>
                                        <input
                                            id="fullName"
                                            type="text"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Ex: Jean Kouamé"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Personnel</label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="email@exemple.com"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Numéro de Téléphone</label>
                                        <input
                                            id="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="+225 00 00 00 00"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ville *</label>
                                        <select
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) => setFormData({...formData, city: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            required
                                        >
                                            <option value="">Sélectionnez votre ville</option>
                                            <option value="Abidjan">Abidjan (Côte d'Ivoire)</option>
                                            <option value="Cotonou">Cotonou (Bénin)</option>
                                            <option value="Yamoussoukro">Yamoussoukro (Côte d'Ivoire)</option>
                                            <option value="Bouaké">Bouaké (Côte d'Ivoire)</option>
                                            <option value="San-Pédro">San-Pédro (Côte d'Ivoire)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="zoneId" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Zone de Collecte</label>
                                        {zones.length > 0 ? (
                                            <select
                                                id="zoneId"
                                                value={formData.zoneId}
                                                onChange={(e) => setFormData({...formData, zoneId: e.target.value})}
                                                className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            >
                                                <option value="">Zone générale (Non spécifiée)</option>
                                                {zones.map((z: any) => (
                                                    <option key={z.id} value={z.id}>{z.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="p-3 bg-zinc-50 border border-gray-150 rounded-xl text-[10px] text-zinc-500 font-bold uppercase tracking-wider dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 animate-pulse">
                                                Aucune zone active enregistrée dans cette ville (Zone générale appliquée par défaut)
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="district" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quartier / Adresse *</label>
                                        <input
                                            id="district"
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
                                        <label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nom Complet</label>
                                        <input
                                            id="fullName"
                                            type="text"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Nom et prénoms"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Professionnel</label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="email@exemple.com"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Numéro de Téléphone</label>
                                        <input
                                            id="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="+225..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ville *</label>
                                        <select
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) => setFormData({...formData, city: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            required
                                        >
                                            <option value="">Sélectionnez votre ville</option>
                                            <option value="Abidjan">Abidjan (Côte d'Ivoire)</option>
                                            <option value="Cotonou">Cotonou (Bénin)</option>
                                            <option value="Yamoussoukro">Yamoussoukro (Côte d'Ivoire)</option>
                                            <option value="Bouaké">Bouaké (Côte d'Ivoire)</option>
                                            <option value="San-Pédro">San-Pédro (Côte d'Ivoire)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="zoneId" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Zone de Collecte</label>
                                        {zones.length > 0 ? (
                                            <select
                                                id="zoneId"
                                                value={formData.zoneId}
                                                onChange={(e) => setFormData({...formData, zoneId: e.target.value})}
                                                className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            >
                                                <option value="">Zone générale (Non spécifiée)</option>
                                                {zones.map((z: any) => (
                                                    <option key={z.id} value={z.id}>{z.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="p-3 bg-zinc-50 border border-gray-150 rounded-xl text-[10px] text-zinc-500 font-bold uppercase tracking-wider dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 animate-pulse">
                                                Aucune zone active enregistrée dans cette ville (Zone générale appliquée par défaut)
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="vehicleType" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Type de Véhicule *</label>
                                        <select
                                            id="vehicleType"
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
                                        <label htmlFor="idNumber" className="text-[10px] font-black uppercase tracking-widest text-gray-400">N° Pièce d'Identité (CNI/Passport)</label>
                                        <input
                                            id="idNumber"
                                            type="text"
                                            value={formData.idNumber}
                                            onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Numéro officiel"
                                        />
                                    </div>
                                </>
                             )}

                             {(role === "organisation_admin" || role === "entreprise") && (
                                <>
                                    <div className="space-y-1">
                                        <label htmlFor="orgName" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nom de la structure</label>
                                        <input
                                            id="orgName"
                                            type="text"
                                            value={formData.orgName}
                                            onChange={(e) => setFormData({...formData, orgName: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder={role === "entreprise" ? "Ex: RecyCo Côte d'Ivoire" : "Ex: ONG Salubrité Propre"}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Professionnel</label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="contact@structure.com"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="contactPerson" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nom du Responsable</label>
                                        <input
                                            id="contactPerson"
                                            type="text"
                                            value={formData.contactPerson}
                                            onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Directeur / Gérant"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ville *</label>
                                        <select
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) => setFormData({...formData, city: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            required
                                        >
                                            <option value="">Sélectionnez votre ville</option>
                                            <option value="Abidjan">Abidjan (Côte d'Ivoire)</option>
                                            <option value="Cotonou">Cotonou (Bénin)</option>
                                            <option value="Yamoussoukro">Yamoussoukro (Côte d'Ivoire)</option>
                                            <option value="Bouaké">Bouaké (Côte d'Ivoire)</option>
                                            <option value="San-Pédro">San-Pédro (Côte d'Ivoire)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="district" className="text-[10px] font-black uppercase tracking-widest text-gray-400">District *</label>
                                        <select
                                            id="district"
                                            value={formData.district}
                                            onChange={(e) => setFormData({...formData, district: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            required
                                        >
                                            <option value="">Sélectionnez le district</option>
                                            <option value="District Autonome d'Abidjan">District Autonome d'Abidjan</option>
                                            <option value="District Autonome de Yamoussoukro">District Autonome de Yamoussoukro</option>
                                            <option value="District des Lacs">District des Lacs</option>
                                            <option value="District de la Vallée du Bandama">District de la Vallée du Bandama</option>
                                            <option value="District du Bas-Sassandra">District du Bas-Sassandra</option>
                                            <option value="Autre District">Autre District</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="commune" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Commune *</label>
                                        <select
                                            id="commune"
                                            value={formData.commune}
                                            onChange={(e) => setFormData({...formData, commune: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            required
                                        >
                                            <option value="">Sélectionnez la commune</option>
                                            <option value="Cocody">Cocody</option>
                                            <option value="Yopougon">Yopougon</option>
                                            <option value="Plateau">Plateau</option>
                                            <option value="Treichville">Treichville</option>
                                            <option value="Marcory">Marcory</option>
                                            <option value="Koumassi">Koumassi</option>
                                            <option value="Abobo">Abobo</option>
                                            <option value="Adjamé">Adjamé</option>
                                            <option value="Port-Bouët">Port-Bouët</option>
                                            <option value="Bingerville">Bingerville</option>
                                            <option value="Songon">Songon</option>
                                            <option value="Autre Commune">Autre Commune</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="zoneId" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Zone de Collecte Initiale</label>
                                        {zones.length > 0 ? (
                                            <select
                                                id="zoneId"
                                                value={formData.zoneId}
                                                onChange={(e) => setFormData({...formData, zoneId: e.target.value})}
                                                className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            >
                                                <option value="">Zone générale (Non spécifiée)</option>
                                                {zones.map((z: any) => (
                                                    <option key={z.id} value={z.id}>{z.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="p-3 bg-zinc-50 border border-gray-150 rounded-xl text-[10px] text-zinc-500 font-bold uppercase tracking-wider dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 animate-pulse">
                                                Aucune zone active enregistrée dans cette ville (Zone générale appliquée par défaut)
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="rccm" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Numéro RCCM / IFU *</label>
                                        <input
                                            id="rccm"
                                            type="text"
                                            value={formData.rccm}
                                            onChange={(e) => setFormData({...formData, rccm: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Enregistrement légal"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Téléphone Siège</label>
                                        <input
                                            id="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="+225..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="agentCount" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nombre d'Agents Estimé</label>
                                        <input
                                            id="agentCount"
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
                                        <label htmlFor="municipalityName" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nom de la Commune</label>
                                        <input
                                            id="municipalityName"
                                            type="text"
                                            value={formData.municipalityName}
                                            onChange={(e) => setFormData({...formData, municipalityName: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Ex: Mairie de Cocody"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Officiel (.gouv / .ci)</label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="contact@commune.gouv.ci"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="officialDepartment" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Service / Direction Référent</label>
                                        <input
                                            id="officialDepartment"
                                            type="text"
                                            value={formData.officialDepartment}
                                            onChange={(e) => setFormData({...formData, officialDepartment: e.target.value})}
                                            className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                            placeholder="Ex: Direction de la Salubrité"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Téléphone Administrateur</label>
                                        <input
                                            id="phone"
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
                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Résumé du compte</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.email}</p>
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Définir un Mot de passe</label>
                                <input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full px-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                    placeholder="••••••••"
                                    required
                                />
                                <p className="text-[9px] text-gray-400 italic">Minimum 6 caractères</p>
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
                                Finaliser l'inscription
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
