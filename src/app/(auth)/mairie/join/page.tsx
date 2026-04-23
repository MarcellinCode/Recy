"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark, ShieldCheck, Mail, Lock, Phone, ArrowRight, Loader2, Building, CreditCard, CheckCircle2, QrCode, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { validateInvitation, consumeInvitation } from "@/app/actions/invitations";
import { motion, AnimatePresence } from "framer-motion";

function MairieJoinForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

    const [formData, setFormData] = useState({
        municipalityName: "",
        officialDepartment: "",
        phone: "",
        email: "",
        password: ""
    });

    useEffect(() => {
        const token = searchParams.get("token");
        const orgName = searchParams.get("org");
        
        if (orgName) {
            setFormData(prev => ({ ...prev, municipalityName: orgName }));
        }

        if (token) {
            validateInvitation(token).then((res) => {
                if (res.valid) {
                    setIsTokenValid(true);
                } else {
                    setIsTokenValid(false);
                    setError("Le lien d'invitation gouvernemental est invalide ou expiré.");
                }
            });
        } else {
            setIsTokenValid(false);
            setError("Aucun jeton d'authentification détecté.");
        }
    }, [searchParams]);

    const handleSignup = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.municipalityName,
                        role: "mairie",
                        subscription_tier: "mairie",
                        phone: formData.phone,
                        official_department: formData.officialDepartment
                    },
                },
            });

            if (authError) throw authError;

            const token = searchParams.get("token");
            if (token && data.user) {
                await consumeInvitation(token, data.user.id);
            }

            // Successfully finished
            setStep(4);
            
            // Redirect after 3s
            setTimeout(() => {
                router.push("/admin/mairie");
            }, 3000);

        } catch (err: any) {
            setError(err.message || "Erreur de configuration du compte.");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.municipalityName || !formData.officialDepartment || !formData.phone) {
                setError("Tous les champs d'identification sont requis.");
                return;
            }
        }
        if (step === 2) {
            if (!formData.email || formData.password.length < 6) {
                setError("L'email officiel et un mot de passe (6 car. min) sont requis.");
                return;
            }
        }
        setError(null);
        setStep(prev => prev + 1);
    };

    const prevStep = () => {
        setError(null);
        setStep(prev => prev - 1);
    };

    if (isTokenValid === null) {
        return (
            <div className="min-h-screen bg-[#07130F] flex flex-col justify-center items-center">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] animate-pulse">Validation des protocoles...</p>
            </div>
        );
    }

    if (isTokenValid === false) {
        return (
            <div className="min-h-screen bg-[#07130F] flex flex-col justify-center items-center px-4">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2rem] max-w-sm w-full text-center text-red-400">
                    <ShieldCheck size={48} className="mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-black uppercase tracking-tighter mb-2">Accès Refusé</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#07130F] flex flex-col md:flex-row relative overflow-hidden">
            {/* Background Details */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
            
            {/* Left Side: Editorial Presentation */}
            <div className="w-full md:w-1/2 p-10 lg:p-20 flex flex-col justify-between relative z-10 border-r border-white/5 bg-black/20">
                <div>
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-primary rounded-2xl flex items-center justify-center text-white mb-8 border border-white/10 shadow-lg shadow-emerald-500/20">
                        <Landmark size={32} />
                    </div>
                    <h1 className="text-5xl lg:text-6xl font-black text-white italic tracking-tighter leading-tight mb-6">
                        City<span className="text-primary/80">O.S.</span><br />
                        <span className="text-3xl text-zinc-400 font-medium tracking-tight mt-2 block not-italic">Création de l'Espace Souverain</span>
                    </h1>
                    <p className="text-zinc-400 max-w-md font-medium leading-relaxed">
                        Bienvenue dans l'écosystème institutionnel de RecyCla. 
                        Digitalisez votre gestion des déchets urbains, suivez vos concessions et gérez l'ensemble de votre flotte de collecteurs depuis un hyperviseur unique.
                    </p>
                </div>

                <div className="mt-12 space-y-6">
                    <div className="flex items-center gap-4 text-emerald-400">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 size={18} /></div>
                        <p className="text-xs font-black uppercase tracking-widest">Technologie Cloud Sécurisée</p>
                    </div>
                    <div className="flex items-center gap-4 text-emerald-400">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><Search size={18} /></div>
                        <p className="text-xs font-black uppercase tracking-widest">Traçabilité Municipale 100%</p>
                    </div>
                </div>
            </div>

            {/* Right Side: Onboarding Flow */}
            <div className="w-full md:w-1/2 p-6 lg:p-20 flex flex-col justify-center relative z-10">
                <div className="max-w-md w-full mx-auto">
                    
                    {/* Stepper Headers */}
                    <div className="flex justify-between items-center mb-10 px-2">
                        {[
                            { num: 1, label: "Identité" },
                            { num: 2, label: "Admin" },
                            { num: 3, label: "Souscription" },
                            { num: 4, label: "Succès" }
                        ].map(s => (
                            <div key={s.num} className="flex flex-col items-center gap-2">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                                    step > s.num ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30" : 
                                    step === s.num ? "border-2 border-emerald-500 text-emerald-500 bg-emerald-500/10" : "bg-zinc-900 border border-zinc-800 text-zinc-600"
                                )}>
                                    {step > s.num ? <CheckCircle2 size={14} /> : s.num}
                                </div>
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-[0.2em]",
                                    step >= s.num ? "text-emerald-400" : "text-zinc-600"
                                )}>{s.label}</span>
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-2xl font-medium animate-in fade-in">
                            {error}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label htmlFor="municipalityName" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Nom Officiel de la Commune</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                                                <Building size={18} />
                                            </div>
                                            <input
                                                id="municipalityName"
                                                required
                                                value={formData.municipalityName}
                                                onChange={(e) => setFormData({ ...formData, municipalityName: e.target.value })}
                                                placeholder="Ex: Mairie de Treichville"
                                                className="w-full pl-14 pr-6 py-5 bg-black/40 border border-zinc-800 focus:border-emerald-500 rounded-3xl text-sm outline-none font-bold text-white transition-all placeholder:text-zinc-600"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="officialDepartment" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Département Référent</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                                                <ShieldCheck size={18} />
                                            </div>
                                            <input
                                                id="officialDepartment"
                                                required
                                                value={formData.officialDepartment}
                                                onChange={(e) => setFormData({ ...formData, officialDepartment: e.target.value })}
                                                placeholder="Ex: Direction de la Voirie et Salubrité"
                                                className="w-full pl-14 pr-6 py-5 bg-black/40 border border-zinc-800 focus:border-emerald-500 rounded-3xl text-sm outline-none font-bold text-white transition-all placeholder:text-zinc-600"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="phone" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Téléphone de l'Instance</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                                                <Phone size={18} />
                                            </div>
                                            <input
                                                id="phone"
                                                type="tel"
                                                required
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="+225..."
                                                className="w-full pl-14 pr-6 py-5 bg-black/40 border border-zinc-800 focus:border-emerald-500 rounded-3xl text-sm outline-none font-bold text-white transition-all placeholder:text-zinc-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={nextStep}
                                    className="w-full py-5 bg-white text-black hover:bg-emerald-400 rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl"
                                >
                                    Poursuivre la configuration <ArrowRight size={16} />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label htmlFor="officialEmail" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Email Officiel (Identifiant)</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                                                <Mail size={18} />
                                            </div>
                                            <input
                                                id="officialEmail"
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="bureau.maire@commune.ci"
                                                className="w-full pl-14 pr-6 py-5 bg-black/40 border border-zinc-800 focus:border-emerald-500 rounded-3xl text-sm outline-none font-bold text-white transition-all placeholder:text-zinc-600"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="officialPassword" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Définir un mot de passe</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                id="officialPassword"
                                                type="password"
                                                required
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="••••••••"
                                                className="w-full pl-14 pr-6 py-5 bg-black/40 border border-zinc-800 focus:border-emerald-500 rounded-3xl text-sm outline-none font-bold text-white transition-all placeholder:text-zinc-600"
                                            />
                                        </div>
                                        <p className="text-[9px] text-zinc-600 italic px-4">Ce mot de passe protégera l'accès au tableau de bord Mairie.</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4">
                                    <button onClick={prevStep} className="py-5 px-6 rounded-3xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest transition-all">Retour</button>
                                    <button onClick={nextStep} className="flex-1 py-5 bg-white text-black hover:bg-emerald-400 rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl">Étape suivante <ArrowRight size={16} /></button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-[2.5rem] p-8 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px]" />
                                     <div className="flex justify-between items-start mb-6">
                                         <div>
                                             <h3 className="text-white font-black uppercase tracking-tight italic text-xl">Licence City OS</h3>
                                             <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">Acquisition de Souveraineté</p>
                                         </div>
                                         <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-400 border border-white/5">
                                             <CreditCard size={20} />
                                         </div>
                                     </div>

                                     <div className="space-y-3 mb-8">
                                         <div className="flex justify-between text-sm text-zinc-300">
                                             <span>Bénéficiaire :</span>
                                             <span className="font-medium text-white">{formData.municipalityName}</span>
                                         </div>
                                         <div className="flex justify-between text-sm text-zinc-300">
                                             <span>Plan de facturation :</span>
                                             <span className="font-medium text-white">Annuel / O.S. Mairie</span>
                                         </div>
                                     </div>

                                     <div className="pt-6 border-t border-zinc-800 flex justify-between items-end">
                                         <div>
                                             <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Montant à régler</p>
                                             <p className="text-4xl text-white font-black tracking-tighter italic">200<span className="text-2xl text-zinc-500">.000</span> <span className="text-lg opacity-50 not-italic uppercase font-bold tracking-widest">CFA</span></p>
                                         </div>
                                         <QrCode size={40} className="text-emerald-500/20" />
                                     </div>
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={prevStep} className="py-5 px-6 rounded-3xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest transition-all">Retour</button>
                                    <button 
                                        onClick={handleSignup} 
                                        disabled={loading}
                                        className="flex-1 py-5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-70"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck size={16} /> Payer & Activer</>}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-10"
                            >
                                <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center text-emerald-400 mx-auto mb-6 border border-emerald-500/20">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-white italic tracking-tighter mb-2">Activation Réussie</h3>
                                <p className="text-zinc-400 text-sm font-medium">Création de votre environnement souverain en cours... Vous allez être redirigé vers le panneau de contrôle.</p>
                                <div className="mt-8 flex justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </div>
        </div>
    );
}

export default function MairieJoinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#07130F] flex flex-col justify-center items-center">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            </div>
        }>
            <MairieJoinForm />
        </Suspense>
    );
}
