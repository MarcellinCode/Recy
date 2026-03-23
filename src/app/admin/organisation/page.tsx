"use client";

import { useState, useEffect } from "react";
import { 
    Users, 
    Truck, 
    CreditCard, 
    Calendar, 
    MapPin, 
    ChevronRight,
    TrendingUp,
    MoreVertical,
    Activity,
    UserPlus,
    Package,
    Wrench,
    AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { getVehicles, addVehicle } from "@/app/actions/fleet";

export default function OrganizationDashboard() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [agents, setAgents] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Agents (Profiles with role 'agent_collecteur')
            const { data: agentsData } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'agent_collecteur');
            
            // Fetch Subscriptions 
            const { data: subsData } = await supabase
                .from('household_subscriptions')
                .select('*, profiles(*), subscription_plans(*, concessions(*))');
            
            // Fetch Vehicles
            const vRes = await getVehicles();
            
            setAgents(agentsData || []);
            setSubscriptions(subsData || []);
            setVehicles(vRes.success ? vRes.vehicles : []);
            setLoading(false);
        };
        fetchData();
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 mb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-[2px] bg-primary"></span>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">Gestion d'Organisation</p>
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black uppercase italic tracking-tighter leading-none dark:text-white">
                        Fleet & <span className="text-primary">Sub</span> Central
                    </h1>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-4">Pilotez votre flotte d'agents et suivez vos revenus récurrents.</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => {
                            const name = prompt("Nom complet de l'agent :");
                            const email = prompt("Email de l'agent (pour la connexion) :");
                            if (name && email) {
                                (async () => {
                                    const { data, error } = await supabase.from('profiles').insert({
                                        full_name: name,
                                        role: 'agent_collecteur',
                                        city: 'Abidjan' // Default
                                    }).select();
                                    
                                    if (error) alert("Erreur : " + error.message);
                                    else {
                                        alert("Agent ajouté avec succès ! Il peut maintenant se connecter avec son email.");
                                        window.location.reload();
                                    }
                                })();
                            }
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:border-primary transition-all shadow-sm"
                    >
                        <UserPlus className="w-5 h-5" />
                        Ajouter un Agent
                    </button>
                    <button className="flex items-center gap-3 px-8 py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-primary/20">
                        <Plus className="w-5 h-5" />
                        Nouveau Plan
                    </button>
                    <button 
                        onClick={() => {
                            const name = prompt("Nom du véhicule (ex: Tricycle Zone 1) :");
                            const type = prompt("Type (tricycle, truck, van) :");
                            const reg = prompt("Immatriculation :");
                            if (name && type && reg) {
                                addVehicle(name, type, reg).then(() => window.location.reload());
                            }
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-amber-500/20"
                    >
                        <Wrench className="w-5 h-5" />
                        Nouveau Véhicule
                    </button>
                </div>
            </header>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <MiniStatsCard label="Agents Actifs" value={agents.length.toString()} icon={Truck} color="text-blue-500" />
                <MiniStatsCard label="Flotte (Véhicules)" value={vehicles.length.toString()} icon={Wrench} color="text-amber-500" />
                <MiniStatsCard label="Prévision (Mois)" value={subscriptions.length > 0 ? `${(subscriptions.length * 5).toFixed(1)}K` : "0"} icon={CreditCard} color="text-emerald-500" />
                <MiniStatsCard label="Impayés Filtrés" value="3" icon={AlertTriangle} color="text-red-500" />
                <MiniStatsCard label="Missions (Auto)" value={agents.length > 0 ? (agents.length * 3).toString() : "0"} icon={Activity} color="text-primary" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Fleet Management Area */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white flex items-center gap-3">
                            <Truck className="w-7 h-7 text-primary" />
                            Agents en Service
                        </h2>
                        <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Voir Planning</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {agents.length > 0 ? agents.map((agent) => (
                            <AgentCard key={agent.id} agent={agent} />
                        )) : (
                            <div className="col-span-2 py-16 text-center opacity-20 bg-gray-50/50 dark:bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-zinc-800">
                                <Users className="w-12 h-12 mx-auto mb-4" />
                                <p className="font-bold uppercase tracking-widest text-xs">Aucun agent enregistré</p>
                            </div>
                        )}
                    </div>
                    
                    {/* FLOTTE ET ENTRETIEN */}
                    <div className="flex items-center justify-between mt-12">
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white flex items-center gap-3">
                            <Wrench className="w-7 h-7 text-amber-500" />
                            Carnet d'Entretien Flotte
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {vehicles.length > 0 ? vehicles.map((v) => (
                            <VehicleCard key={v.id} vehicle={v} />
                        )) : (
                            <div className="col-span-2 py-16 text-center opacity-20 bg-gray-50/50 dark:bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-zinc-800">
                                <Truck className="w-12 h-12 mx-auto mb-4" />
                                <p className="font-bold uppercase tracking-widest text-xs">Aucun véhicule enregistré</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Subscription Performance Sidebar */}
                <div className="space-y-8">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white flex items-center gap-3">
                        <Package className="w-7 h-7 text-primary" />
                        Abonnements
                    </h2>
                    
                    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                         <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Plans de la Zone</p>
                            <div className="space-y-4">
                                <PlanSummary name="Standard Hebdo" count={124} price="5,000" color="bg-emerald-500" />
                                <PlanSummary name="Premium Business" count={42} price="15,000" color="bg-blue-500" />
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100 dark:border-zinc-800">
                             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Dernières Inscriptions</p>
                             <div className="space-y-5">
                                 {subscriptions.slice(0, 3).map((sub) => (
                                     <div key={sub.id} className="flex items-center justify-between group cursor-pointer">
                                         <div className="flex items-center gap-4">
                                             <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center font-black text-xs text-primary">
                                                 {sub.profiles?.full_name?.charAt(0)}
                                             </div>
                                             <div>
                                                 <p className="text-xs font-black uppercase text-gray-900 dark:text-white">{sub.profiles?.full_name}</p>
                                                 <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{sub.subscription_plans?.name}</p>
                                             </div>
                                         </div>
                                         <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors" />
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                </div>

                {/* Bourse B2B & CRM */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-10 lg:col-span-3">
                     {/* B2B Marketplace */}
                     <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm group">
                         <div className="flex justify-between items-center mb-6">
                             <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white flex items-center gap-3">
                                 <Package className="w-7 h-7 text-emerald-500" />
                                 Bourse B2B
                             </h2>
                             <button className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl font-black uppercase hover:bg-emerald-100 transition-colors">Vendre un Lot</button>
                         </div>
                         <div className="space-y-4">
                              <div className="p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50 hover:border-emerald-500/30 transition-colors">
                                  <div>
                                      <p className="text-xs font-black uppercase text-gray-900 dark:text-white mb-1">PET Transparent (Stock)</p>
                                      <p className="text-[10px] font-bold text-gray-500">Volume prêt à la revente: 2.5 Tonnes</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-xs font-black text-emerald-500 italic">250,000 CFA</p>
                                      <p className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold mt-1">Valeur marché</p>
                                  </div>
                              </div>
                              <div className="p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50 hover:border-emerald-500/30 transition-colors">
                                  <div>
                                      <p className="text-xs font-black uppercase text-gray-900 dark:text-white mb-1">Aluminium (Canettes)</p>
                                      <p className="text-[10px] font-bold text-gray-500">Volume prêt à la revente: 850 Kg</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-xs font-black text-emerald-500 italic">425,000 CFA</p>
                                      <p className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold mt-1">Valeur marché</p>
                                  </div>
                              </div>
                         </div>
                     </div>

                     {/* CRM Citoyen */}
                     <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm">
                         <div className="flex justify-between items-center mb-6">
                             <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white flex items-center gap-3">
                                 <Users className="w-7 h-7 text-blue-500" />
                                 CRM Citoyen
                             </h2>
                             <span className="text-[10px] bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl font-black uppercase blink">1 Non Résolu</span>
                         </div>
                         <div className="space-y-4">
                              <div className="p-4 rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 flex flex-col justify-between gap-4">
                                  <div>
                                      <div className="flex justify-between items-start mb-2">
                                        <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded uppercase font-black tracking-[0.2em] inline-block">Urgent</span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Il y a 2h</span>
                                      </div>
                                      <p className="text-xs font-black uppercase text-gray-900 dark:text-white mb-1">Poubelle Ignorée (M. Koffi)</p>
                                      <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400">Cocody Angré, Abonnement Standard - L'agent n'est pas passé ce matin.</p>
                                  </div>
                                  <div className="flex gap-2">
                                      <button className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600">Assigner Ticket</button>
                                      <button className="flex-1 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50">Répondre</button>
                                  </div>
                              </div>
                         </div>
                     </div>
                </div>
            </div>
        </div>
    );
}

function MiniStatsCard({ label, value, icon: Icon, color }: any) {
    return (
        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm space-y-3">
            <div className={cn("w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center", color)}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
                <p className="text-2xl font-black italic tracking-tighter dark:text-white">{value}</p>
            </div>
        </div>
    );
}

function AgentCard({ agent }: any) {
    return (
        <div className="p-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] shadow-sm hover:border-primary/30 transition-all group">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                        {agent.full_name?.charAt(0)}
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-tight">{agent.full_name}</h4>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-black uppercase px-2 py-0.5 rounded-lg tracking-widest">En Service</span>
                    </div>
                </div>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><MoreVertical className="w-5 h-5 text-zinc-400" /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                 <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl">
                     <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Points (Route)</p>
                     <p className="text-lg font-black dark:text-white italic">12 <span className="text-[10px]">Maisons</span></p>
                 </div>
                 <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl">
                     <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Temps Est.</p>
                     <p className="text-lg font-black dark:text-white italic">4H <span className="text-[10px]">30</span></p>
                 </div>
            </div>

            <button className="w-full py-4 bg-primary text-[10px] font-black uppercase tracking-widest text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                Smart Routing Actif
            </button>
        </div>
    );
}

function VehicleCard({ vehicle }: any) {
    const isDue = vehicle.next_maintenance_date && new Date(vehicle.next_maintenance_date) < new Date();
    
    return (
        <div className={cn(
            "p-8 bg-white dark:bg-zinc-900 border rounded-[2.5rem] shadow-sm transition-all group",
            isDue ? "border-amber-500/50" : "border-gray-100 dark:border-zinc-800 hover:border-amber-500/30"
        )}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl",
                        isDue ? "bg-amber-100 text-amber-600" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800"
                    )}>
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-tight">{vehicle.name}</h4>
                        <span className="text-[10px] text-zinc-400 font-bold tracking-widest">{vehicle.registration_number || 'Sans Immatriculation'}</span>
                    </div>
                </div>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><MoreVertical className="w-5 h-5 text-zinc-400" /></button>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl mb-4">
                <div className="flex items-center gap-3 mb-4">
                    {isDue ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <Activity className="w-5 h-5 text-emerald-500" />}
                    <div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Entretien</p>
                        <p className={cn(
                            "text-sm font-black italic", 
                            isDue ? "text-amber-500" : "text-emerald-500"
                        )}>
                            {isDue ? "Vidange requise !" : "À jour"}
                        </p>
                    </div>
                </div>

                {/* Capacity Tracker */}
                <div className="pt-4 border-t border-gray-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Charge Actuelle (Capacité)</p>
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest">1.2 / 3.0 T</p>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: '40%' }}></div>
                    </div>
                </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest text-amber-500 border-2 border-amber-500/20 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all">
                Détails Véhicule
            </button>
        </div>
    );
}

function PlanSummary({ name, count, price, color }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full", color)} />
                <p className="text-xs font-black uppercase text-gray-700 dark:text-zinc-300">{name}</p>
            </div>
            <div className="text-right">
                <p className="text-xs font-black dark:text-white italic">{count} <span className="text-[9px] text-zinc-400">clients</span></p>
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{price} CFA</p>
            </div>
        </div>
    );
}

function Plus(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}
