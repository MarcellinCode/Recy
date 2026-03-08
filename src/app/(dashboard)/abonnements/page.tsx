"use client";

import { useState, useEffect } from "react";
import { Check, Zap, Crown, Shield, Rocket, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

export default function AbonnementsPage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
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
    }, [supabase]);

    const handleUpgrade = async (tier: string) => {
        if (!user) return;
        setUpdating(tier);

        const { error } = await supabase
            .from('profiles')
            .update({ subscription_tier: tier.toLowerCase() })
            .eq('id', user.id);

        if (error) {
            showToast("Erreur lors de la mise à jour : " + error.message, "error");
        } else {
            setProfile({ ...profile, subscription_tier: tier.toLowerCase() });
            showToast(`Félicitations ! Vous êtes maintenant en mode ${tier}.`, "success");
        }
        setUpdating(null);
    };

    const tiers = [
        {
            name: "Starter",
            price: "Gratuit",
            description: "Idéal pour débuter votre activité de collecte.",
            icon: <Rocket className="w-6 h-6 text-gray-400" />,
            features: [
                "Accès à la Marketplace standard",
                "Gestion de 5 collectes/mois",
                "Support par email",
                "Points éco de base"
            ],
            color: "bg-gray-50 dark:bg-zinc-800",
            buttonColor: "bg-gray-900",
            tier: "starter"
        },
        {
            name: "Pro",
            price: "9.900 FCFA / mois",
            description: "Boostez votre rendement avec des outils avancés.",
            icon: <Zap className="w-6 h-6 text-amber-500" />,
            features: [
                "Accès prioritaire aux nouveaux lots",
                "Collectes illimitées",
                "Statistiques de performance",
                "Support prioritaire",
                "Badge Pro sur le profil"
            ],
            color: "bg-amber-500/5 border-amber-500/20",
            buttonColor: "bg-amber-600",
            recommended: true,
            tier: "pro"
        },
        {
            name: "Business",
            price: "24.900 FCFA / mois",
            description: "La solution complète pour les grandes entreprises.",
            icon: <Crown className="w-6 h-6 text-blue-500" />,
            features: [
                "Tout ce qui est dans Pro",
                "Gestion d'équipe (multi-comptes)",
                "Export de données analytiques",
                "API d'intégration",
                "Gestionnaire de compte dédié"
            ],
            color: "bg-blue-500/5 border-blue-500/20",
            buttonColor: "bg-blue-600",
            tier: "business"
        }
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Préparation des offres...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center mb-20">
                <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter italic">
                    Propulsez votre <span className="text-primary">Impact</span>
                </h1>
                <p className="text-gray-500 max-w-2xl mx-auto font-bold text-sm uppercase tracking-widest">
                    Choisissez le forfait qui correspond à votre ambition de collecteur.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {tiers.map((t) => {
                    const isCurrent = profile?.subscription_tier === t.tier;

                    return (
                        <div
                            key={t.name}
                            className={cn(
                                "relative flex flex-col p-10 rounded-[3rem] border-2 transition-all duration-300 hover:scale-[1.02]",
                                isCurrent ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-2xl" : "border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                            )}
                        >
                            {t.recommended && !isCurrent && (
                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                    Recommandé
                                </span>
                            )}

                            {isCurrent && (
                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                    Votre Forfait Actuel
                                </span>
                            )}

                            <div className="mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center mb-6">
                                    {t.icon}
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{t.name}</h2>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-gray-900 dark:text-white">{t.price}</span>
                                    {t.tier !== 'starter' && <span className="text-xs font-bold text-gray-400 uppercase">/ mois</span>}
                                </div>
                                <p className="mt-4 text-xs font-medium text-gray-400 leading-relaxed">{t.description}</p>
                            </div>

                            <div className="flex-1 space-y-4 mb-10">
                                {t.features.map((feature) => (
                                    <div key={feature} className="flex items-start gap-3">
                                        <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-green-600" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest leading-none">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleUpgrade(t.tier)}
                                disabled={isCurrent || updating !== null}
                                className={cn(
                                    "w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2",
                                    isCurrent ? "bg-gray-100 text-gray-400 cursor-default" : cn(t.buttonColor, "text-white shadow-xl")
                                )}
                            >
                                {updating === t.tier ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        {isCurrent ? "Activé" : "Commencer Maintenant"}
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
