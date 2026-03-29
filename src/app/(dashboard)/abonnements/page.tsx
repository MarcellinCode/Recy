"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
    ShieldCheck, 
    Zap, 
    Calendar, 
    CheckCircle2, 
    AlertTriangle, 
    Trash2, 
    ArrowRight,
    Loader2,
    Building2,
    Truck,
    MapPin,
    AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function SubscriptionPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);
    const [zone, setZone] = useState<any>(null);
    const [isAlerting, setIsAlerting] = useState(false);
    const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isSimulatingId, setIsSimulatingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchSubscriptionData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Profile & Zone
            const { data: profile } = await supabase
                .from('profiles')
                .select('*, zones(*)')
                .eq('id', user.id)
                .single();
            
            setZone(profile?.zones);

            // 2. Fetch Active Subscription
            const { data: sub } = await supabase
                .from('household_subscriptions')
                .select('*, subscription_plans(*, concessions(*, profiles(*)))')
                .eq('profile_id', user.id)
                .eq('status', 'active')
                .single();
            
            setSubscription(sub);

            // 3. Define Plans based on Role
            // Fallback: si le champ role n'est pas dans la table profiles, on le lit depuis user_metadata
            const userRole = profile?.role || user.user_metadata?.role;
            console.log('[Abonnement] Rôle détecté:', userRole, '| Profile role:', profile?.role, '| Metadata role:', user.user_metadata?.role);
            let plans = [];

            if (userRole === 'vendeur') {
                plans = [
                    { id: 'v1', name: 'Foyer', price_cfa: 2000, frequency_per_week: 1, description: 'Ramassage régulier pour les familles.' },
                    { id: 'v2', name: 'Entreprise', price_cfa: 6000, frequency_per_week: 3, description: 'Idéal pour les boutiques et bureaux.' },
                    { id: 'v3', name: 'Industrie', price_cfa: 15000, frequency_per_week: 'Sur demande', description: 'Volumes importants & traçabilité.' }
                ];
            } else if (userRole === 'collecteur') {
                plans = [
                    { id: 'c1', name: 'Acheteur Premium', price_cfa: 6000, frequency_per_week: 'Illimité', description: 'Pour les individus acheteurs de déchets recyclables.' }
                ];
            } else if (userRole === 'organisation_admin' || userRole === 'entreprise') {
                plans = [
                    { id: 'o1', name: 'Organisation', price_cfa: 20000, frequency_per_week: 'Gestion Zone', description: 'Gestion complète de votre zone.' }
                ];
            } else if (userRole === 'mairie') {
                plans = [
                    { id: 'm1', name: 'Mairie (Elite)', price_cfa: 200000, frequency_per_week: 'Souveraineté', description: 'Souveraineté territoriale totale.' }
                ];
            } else {
                plans = [
                    { id: 'p1', name: 'Standard Hebdo', price_cfa: 5000, frequency_per_week: 1, description: 'Collecte une fois par semaine' }
                ];
            }
            setAvailablePlans(plans);
            
            setLoading(false);
        };
        fetchSubscriptionData();
    }, []);

    const handleAlert = () => {
        setIsAlerting(true);
        setTimeout(() => setIsAlerting(false), 3000);
    };

    const handleSubscribe = async (plan: any) => {
        setIsSimulatingId(plan.id);
        
        // Simulation d'attente
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setSubscription({
            status: 'active',
            subscription_plans: plan
        });
        
        setIsSimulatingId(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Chargement de votre catalogue...</p>
            </div>
        );
    }

    const titles = {
        vendeur: "Abonnement Collecte",
        collecteur: "Forfait Acheteur",
        organisation_admin: "Outils de Souveraineté",
        entreprise: "Outils de Souveraineté",
        mairie: "Outils de Souveraineté"
    };

    const subtitles = {
        vendeur: "Pour les foyers et entreprises qui produisent des déchets.",
        collecteur: "Pour les individus acheteurs de déchets recyclables.",
        organisation_admin: "Pour les organisations de collecte privées.",
        entreprise: "Pour les organisations de collecte privées.",
        mairie: "Pour les mairies et collectivités territoriales."
    };

    const currentCatalog = availablePlans[0]?.id?.startsWith('m') ? 'mairie' : 
                         availablePlans[0]?.id?.startsWith('o') ? 'organisation_admin' : 
                         availablePlans[0]?.id?.startsWith('c') ? 'collecteur' : 'vendeur';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 mb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 text-center md:text-left">
                <div className="mx-auto md:mx-0">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                        <span className="w-8 h-[2px] bg-primary"></span>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">RecyCla Impact</p>
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-black uppercase italic tracking-tighter leading-none dark:text-white">
                        Propulsez Votre <span className="text-primary">Impact</span>
                    </h1>
                </div>
            </header>

            {!subscription ? (
                /* Discovery Flow */
                <div className="space-y-16">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter dark:text-white">
                            {(titles as any)[currentCatalog]}
                        </h2>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                            {(subtitles as any)[currentCatalog]}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center max-w-5xl mx-auto">
                        {availablePlans.map((plan) => (
                            <PlanCard 
                                key={plan.id} 
                                plan={plan} 
                                onSubscribe={handleSubscribe} 
                                isSimulating={isSimulatingId === plan.id}
                            />
                        ))}
                    </div>

                    <div className="pt-16 border-t border-zinc-100 dark:border-white/5">
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-10">Avantages Exclusifs</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                            <BenefitItem 
                                icon={Calendar} 
                                title="Planification Optimisée" 
                                desc={currentCatalog === 'vendeur' ? "Passages réguliers 1 à 3 fois par semaine." : "Optimisation des tournées via IA."} 
                            />
                            <BenefitItem 
                                icon={ShieldCheck} 
                                title="Certifications" 
                                desc={currentCatalog === 'vendeur' ? "Points éco-citoyens et certificats de tri." : "Rapports d'impact RSE certifiés."} 
                            />
                            <BenefitItem 
                                icon={Truck} 
                                title="Gestion de Flotte" 
                                desc={currentCatalog === 'vendeur' ? "Collecteurs géo-localisés en temps réel." : "Carnet d'entretien numérique complet."} 
                            />
                            <BenefitItem 
                                icon={Zap} 
                                title="Support B2B" 
                                desc="Assistance prioritaire 7j/7 par nos experts." 
                            />
                        </div>
                    </div>
                </div>
            ) : (
                /* Active Subscription View */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div className="bg-emerald-500 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 p-12 opacity-20">
                                <CheckCircle2 className="w-48 h-48" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-emerald-100">Abonnement Actif</p>
                                <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-2">{subscription.subscription_plans?.name}</h2>
                                <p className="text-sm font-medium opacity-80 mb-8">Votre service est opérationnel. Merci pour votre engagement écologique.</p>
                                <div className="flex gap-4">
                                    <div className="px-5 py-3 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-md">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Status</p>
                                        <p className="text-lg font-black italic">PREMIUM</p>
                                    </div>
                                    <div className="px-5 py-3 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-md">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Catégorie</p>
                                        <p className="text-lg font-black italic">{subscription.subscription_plans?.frequency_per_week}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <Link href="/reservations" className="block p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] text-left hover:border-primary transition-all">
                                <Calendar className="w-8 h-8 text-primary mb-4" />
                                <h3 className="font-black uppercase text-xs tracking-widest dark:text-white">Planning</h3>
                                <p className="text-[10px] text-zinc-500 mt-1 font-bold">Consulter les interventions</p>
                            </Link>
                            <Link href="/dashboard" className="block p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] text-left hover:border-red-500/50 transition-all">
                                <Trash2 className="w-8 h-8 text-red-500 mb-4" />
                                <h3 className="font-black uppercase text-xs tracking-widest dark:text-white">Gérer</h3>
                                <p className="text-[10px] text-zinc-500 mt-1 font-bold">Retour rapide au Dashboard</p>
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-zinc-800 text-center space-y-8">
                        <div className="relative">
                            <ShieldCheck className="w-20 h-20 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-2">Données Sécurisées</h3>
                            <p className="text-xs font-medium text-zinc-500 max-w-xs mx-auto mt-2 leading-relaxed mb-8">
                                Toutes vos transactions et données d'impact sont certifiées conformes aux normes environnementales locales.
                            </p>
                            
                            <Link href="/dashboard" className="inline-flex items-center justify-center px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-primary transition-all hover:text-white shadow-xl">
                                Accéder au Tableau de Bord <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PlanCard({ plan, onSubscribe, isSimulating }: any) {
    return (
        <div className="p-10 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[3rem] shadow-sm hover:border-primary/40 transition-all group relative overflow-hidden flex flex-col justify-between h-full">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Building2 className="w-32 h-32" />
            </div>
            <div className="relative z-10">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-2">{plan.name}</h3>
                <p className="text-xs text-zinc-500 font-medium mb-8 leading-relaxed italic">"{plan.description}"</p>
                
                <div className="space-y-3 mb-10">
                    <BenefitSmall text={plan.frequency_per_week === 'Souveraineté' ? "Territoire Illimité" : `${plan.frequency_per_week} passages / sem`} />
                    <BenefitSmall text="Points Éco-citoyens" />
                    <BenefitSmall text="Support Prioritaire 7/7" />
                </div>

                <div className="text-4xl font-black text-gray-900 dark:text-white italic tracking-tighter mb-8 bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-white/5">
                    {plan.price_cfa?.toLocaleString()} <span className="text-sm font-bold opacity-30 italic">CFA / mois</span>
                </div>
            </div>
            <button 
                onClick={() => onSubscribe(plan)}
                disabled={isSimulating}
                className="w-full py-5 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3">
                {isSimulating ? "Traitement..." : "Souscrire maintenant"} 
                {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
        </div>
    );
}

function BenefitSmall({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider italic">{text}</span>
        </div>
    );
}

function BenefitItem({ icon: Icon, title, desc }: any) {
    return (
        <div className="flex gap-5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-primary shrink-0 border border-zinc-200 dark:border-white/5">
                <Icon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
                <h4 className="font-black text-xs uppercase tracking-tight text-zinc-900 dark:text-white">{title}</h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed italic uppercase">{desc}</p>
            </div>
        </div>
    );
}
