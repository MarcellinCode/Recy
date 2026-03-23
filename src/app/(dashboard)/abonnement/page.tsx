"use client";

import { useState, useEffect } from "react";
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

            // 3. Fetch Available Plans (Mocked if no zone)
            if (profile?.zones) {
                const { data: plans } = await supabase
                    .from('subscription_plans')
                    .select('*')
                    .eq('concession_id', sub?.subscription_plans?.concession_id || ''); // This is simplified
                setAvailablePlans(plans || []);
            } else {
                // Mock plans for display
                setAvailablePlans([
                    { id: 'p1', name: 'Standard Hebdo', price_cfa: 5000, frequency_per_week: 1, description: 'Collecte une fois par semaine' },
                    { id: 'p2', name: 'Premium Business', price_cfa: 15000, frequency_per_week: 3, description: 'Collecte 3 fois par semaine + prioritaire' }
                ]);
            }
            
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
        
        const { data: { user } } = await supabase.auth.getUser();
        
        // Simulez une validation locale directement pour la démo
        setSubscription({
            status: 'active',
            subscription_plans: plan
        });
        
        setIsSimulatingId(null);
    };

    const handleGeolocate = () => {
        setIsLocating(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setIsLocating(false);
                },
                (error) => {
                    console.error("Erreur de géolocalisation:", error);
                    alert("Impossible d'obtenir votre position.");
                    setIsLocating(false);
                }
            );
        } else {
            alert("La géolocalisation n'est pas supportée par votre navigateur.");
            setIsLocating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Vérification de votre zone...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 mb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-[2px] bg-primary"></span>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">Mon Service Salubrité</p>
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black uppercase italic tracking-tighter leading-none dark:text-white">
                        Ma <span className="text-primary">Collecte</span> Locale
                    </h1>
                    {zone ? (
                        <div className="flex items-center gap-2 mt-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                            <MapPin className="w-4 h-4 text-red-500" />
                            Zone : {zone.name}
                        </div>
                    ) : (
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-4 mb-4">Abonnez-vous pour un service de collecte régulier à domicile.</p>
                    )}

                    {!subscription && (
                        <button 
                            onClick={handleGeolocate} 
                            disabled={isLocating}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                location ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400",
                                isLocating && "opacity-50"
                            )}>
                            <MapPin className="w-4 h-4" />
                            {isLocating ? 'Recherche...' : location ? 'Position enregistrée ✓' : 'Me géolocaliser automatiquement'}
                        </button>
                    )}
                </div>
            </header>

            {!subscription ? (
                /* Discovery Flow */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-8">
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Forfaits Disponibles</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {availablePlans.map((plan) => (
                                <PlanCard 
                                    key={plan.id} 
                                    plan={plan} 
                                    onSubscribe={handleSubscribe} 
                                    isSimulating={isSimulatingId === plan.id}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Pourquoi s'abonner ?</h2>
                        <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 text-white space-y-6">
                            <BenefitItem icon={Calendar} title="Passages Réguliers" desc="Plus besoin de stocker vos ordures, nous passons 1 à 3 fois par semaine." />
                            <BenefitItem icon={ShieldCheck} title="Mairie Certifiée" desc="Service officiel contrôlé par votre municipalité." />
                            <BenefitItem icon={Zap} title="Bouton d'Urgence" desc="Accès illimité au signalement 'Bac Plein' en cas de surcharge." />
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
                                <p className="text-sm font-medium opacity-80 mb-8">Votre prochain passage est prévu pour Mercredi après-midi.</p>
                                <div className="flex gap-4">
                                    <div className="px-5 py-3 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-md">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Fréquence</p>
                                        <p className="text-lg font-black italic">{subscription.subscription_plans?.frequency_per_week}x / sem</p>
                                    </div>
                                    <div className="px-5 py-3 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-md">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Opérateur</p>
                                        <p className="text-lg font-black italic">Trier-Pro</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <button className="p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] text-left hover:border-primary transition-all">
                                <Calendar className="w-8 h-8 text-primary mb-4" />
                                <h3 className="font-black uppercase text-xs tracking-widest dark:text-white">Calendrier</h3>
                                <p className="text-[10px] text-zinc-500 mt-1 font-bold">Modifier les jours de passage</p>
                            </button>
                            <button className="p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] text-left hover:border-red-500/50 transition-all">
                                <Trash2 className="w-8 h-8 text-red-500 mb-4" />
                                <h3 className="font-black uppercase text-xs tracking-widest dark:text-white">Résiliation</h3>
                                <p className="text-[10px] text-zinc-500 mt-1 font-bold">Gérer mon engagement</p>
                            </button>
                        </div>
                    </div>

                    {/* Emergency Section */}
                    <div className="flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-zinc-800 text-center space-y-8">
                        <div className="relative">
                            <div className={cn(
                                "absolute inset-0 bg-red-500 rounded-full blur-2xl transition-all duration-1000",
                                isAlerting ? "opacity-40 scale-150" : "opacity-0"
                            )} />
                            <button 
                                onClick={handleAlert}
                                disabled={isAlerting}
                                className={cn(
                                    "relative w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 border-8 shadow-2xl transition-all active:scale-90",
                                    isAlerting 
                                        ? "bg-red-500 border-red-600 text-white animate-pulse" 
                                        : "bg-white dark:bg-zinc-800 border-white dark:border-zinc-700 text-red-500 hover:scale-105"
                                )}
                            >
                                <AlertTriangle className="w-10 h-10" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Appui</span>
                            </button>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Bouton Bac Plein</h3>
                            <p className="text-xs font-medium text-zinc-500 max-w-xs mx-auto mt-2 leading-relaxed">
                                {isAlerting 
                                    ? "Alerte envoyée aux agents de votre zone !" 
                                    : "Votre bac est déjà plein ? Appuyez pour demander un passage immédiat."}
                            </p>
                        </div>
                        {isAlerting && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Votre demande est prioritée
                            </motion.div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function PlanCard({ plan, onSubscribe, isSimulating }: any) {
    return (
        <div className="p-10 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[3rem] shadow-sm hover:border-primary/40 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Building2 className="w-32 h-32" />
            </div>
            <div className="relative z-10">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-2">{plan.name}</h3>
                <p className="text-xs text-zinc-500 font-medium mb-8 leading-relaxed italic">"{plan.description}"</p>
                <div className="text-4xl font-black text-gray-900 dark:text-white italic tracking-tighter mb-8">
                    {plan.price_cfa?.toLocaleString()} <span className="text-sm font-bold opacity-30">CFA / mois</span>
                </div>
                <button 
                    onClick={() => onSubscribe(plan)}
                    disabled={isSimulating}
                    className="w-full py-5 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3">
                    {isSimulating ? "Simulation..." : "S'abonner (Simult.)"} 
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}

function BenefitItem({ icon: Icon, title, desc }: any) {
    return (
        <div className="flex gap-5">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0">
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h4 className="font-black text-sm uppercase tracking-tight text-white">{title}</h4>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed italic">{desc}</p>
            </div>
        </div>
    );
}
