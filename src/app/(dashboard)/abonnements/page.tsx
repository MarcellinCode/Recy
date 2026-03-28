"use client";

import { useState, useEffect } from "react";
import { Check, Shield, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";
import { subscribeToPlatform } from "@/app/actions/subscriptions";

interface SubscriptionTier {
    name: string;
    price: string;
    description: string;
    features: string[];
    tier: 'household' | 'business_local' | 'industry' | 'free' | 'collector_premium' | 'organisation_standard' | 'mairie_elite';
}

interface Category {
    title: string;
    subtitle: string;
    tiers: SubscriptionTier[];
}

export default function AbonnementsPage() {
    const supabase = createClient();
    const [user, setUser] = useState<any | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setProfile(data);
            }
            setLoading(false);
        };
        fetchData();
    }, []);


    const [activeTab, setActiveTab] = useState<'citizen' | 'collector' | 'partner'>('citizen');

    const handleUpgrade = async (tier: SubscriptionTier['tier']) => {
        if (!user) return;
        setUpdating(tier);
        
        const res = await subscribeToPlatform(tier);

        if (!res.success) {
            showToast("Erreur : " + res.error, "error");
        } else {
            if (profile) {
                setProfile({ ...profile, subscription_tier: tier.split('_')[0] });
            }
            showToast(`Félicitations ! Votre abonnement est activé.`, "success");
        }
        setUpdating(null);
    };

    const categories: Record<'citizen' | 'collector' | 'partner', Category> = {
        citizen: {
            title: "Abonnement Collecte",
            subtitle: "Pour les foyers et entreprises qui produisent des déchets.",
            tiers: [
                {
                    name: "Foyer",
                    price: "2.000",
                    description: "Ramassage régulier pour les familles.",
                    features: ["1 passage / semaine", "Points Éco-Citoyens", "Support standard"],
                    tier: "household"
                },
                {
                    name: "Entreprise",
                    price: "6.000",
                    description: "Idéal pour les boutiques et bureaux.",
                    features: ["3 passages / semaine", "Certificat de tri de base", "Support prioritaire"],
                    tier: "business_local"
                },
                {
                    name: "Industrie",
                    price: "15.000",
                    description: "Volumes importants & traçabilité.",
                    features: ["Passages sur demande", "Rapport RSE certifié", "Gestionnaire dédié"],
                    tier: "industry"
                }
            ]
        },
        collector: {
            title: "Marché des Matériaux",
            subtitle: "Pour les acheteurs et recycleurs sur la marketplace.",
            tiers: [
                {
                    name: "Gratuit",
                    price: "0",
                    description: "Pour débuter sur le marché.",
                    features: ["3 réservations / mois", "Accès standard bourse", "Alertes email"],
                    tier: "free"
                },
                {
                    name: "Premium",
                    price: "5.000",
                    description: "Pour les professionnels du recyclage.",
                    features: ["Réservations illimitées", "Accès complet bourse", "Support 24/7"],
                    tier: "collector_premium"
                }
            ]
        },
        partner: {
            title: "Outils de Souveraineté",
            subtitle: "Pour les Mairies et les Organisations de collecte.",
            tiers: [
                {
                    name: "Organisation",
                    price: "20.000",
                    description: "Gestion complète de votre zone.",
                    features: ["Gestion flotte & agents", "Optimisation de trajets IA", "Suivi abonnés zone"],
                    tier: "organisation_standard"
                },
                {
                    name: "Mairie (Elite)",
                    price: "200.000",
                    description: "Souveraineté territoriale totale.",
                    features: ["Carnet entretien & Maintenance", "Gestion des concessions", "Contrôle souverain City OS"],
                    tier: "mairie_elite"
                }
            ]
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Chargement des offres...</p>
        </div>
    );

    const currentCategory = categories[activeTab];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center mb-16">
                <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter italic">
                    Propulsez votre <span className="text-primary">Impact</span>
                </h1>
                
                {/* Tab Switcher */}
                <div className="flex justify-center mt-10">
                    <div className="p-1.5 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex gap-1">
                        {(['citizen', 'collector', 'partner'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab 
                                        ? "bg-white dark:bg-zinc-900 text-primary shadow-sm" 
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {tab === 'citizen' ? 'Particulier/Entreprise' : tab === 'collector' ? 'Acheteur' : 'Mairie/Organisation'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mb-12 text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic mb-2">{currentCategory.title}</h2>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">{currentCategory.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
                {currentCategory.tiers.map((t: any) => {
                    const isCurrent = profile?.subscription_tier === t.tier?.split('_')[0];

                    return (
                        <div
                            key={t.name}
                            className={cn(
                                "relative flex flex-col p-8 rounded-[3rem] border-2 transition-all duration-300 hover:scale-[1.02]",
                                isCurrent ? "border-primary bg-primary/5 shadow-xl" : "border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                            )}
                        >
                            <div className="mb-8">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{t.name}</h3>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-gray-900 dark:text-white">{t.price}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">FCFA / mois</span>
                                </div>
                                <p className="mt-4 text-[10px] font-medium text-gray-400 leading-relaxed uppercase">{t.description}</p>
                            </div>

                            <div className="flex-1 space-y-4 mb-10">
                                {t.features.map((feature: string) => (
                                    <div key={feature} className="flex items-start gap-3">
                                        <Check className="w-3 h-3 text-green-600 mt-0.5" />
                                        <span className="text-[9px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest leading-none">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleUpgrade(t.tier)}
                                disabled={isCurrent || updating !== null}
                                className={cn(
                                    "w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2",
                                    isCurrent ? "bg-gray-100 text-gray-400 cursor-default" : "bg-primary text-white shadow-xl shadow-primary/20"
                                )}
                            >
                                {updating === t.tier ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        {isCurrent ? "Plan Actuel" : "Souscrire"}
                                        {!isCurrent && <ArrowRight className="w-4 h-4" />}
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-20 bg-gray-900 dark:bg-zinc-800 rounded-[3rem] p-12 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <Shield className="w-96 h-96 -ml-20 -mt-20 rotate-12" />
                </div>
                <h2 className="text-2xl font-black mb-4 uppercase tracking-tight relative z-10">Besoin d'une offre sur mesure ?</h2>
                <p className="text-gray-400 max-w-xl mx-auto mb-8 font-bold text-xs uppercase tracking-widest relative z-10 leading-loose">
                    Vous êtes une entreprise de recyclage à grande échelle ? Contactez notre équipe commerciale pour une solution adaptée à vos volumes.
                </p>
                <button className="px-10 py-4 border-2 border-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-gray-900 transition-all relative z-10">
                    Contacter le support B2B
                </button>
            </div>
        </div>
    );
}
