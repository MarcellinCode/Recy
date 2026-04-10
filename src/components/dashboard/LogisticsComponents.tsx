"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
    Truck, 
    Battery, 
    Fuel, 
    Zap, 
    Wrench, 
    User, 
    MapPin, 
    Activity,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Navigation,
    TrendingUp
} from "lucide-react";

/**
 * VehicleCard: Carte de télémétrie haute densité pour une unité de la flotte
 */
export function VehicleCard({ vehicle, position }: { vehicle: any, position?: any }) {
    // Simulation de télémétrie si non présente dans la DB
    const batteryLevel = vehicle.battery_level ?? Math.floor(Math.random() * 40) + 60;
    const loadLevel = vehicle.load_level ?? Math.floor(Math.random() * 50) + 20;
    
    const statusColors = {
        active: "text-emerald-500 bg-emerald-50 border-emerald-100",
        en_mouvement: "text-blue-500 bg-blue-50 border-blue-100",
        en_maintenance: "text-amber-500 bg-amber-50 border-amber-100",
        out_of_service: "text-red-500 bg-red-50 border-red-100"
    };

    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white/90 backdrop-blur-xl border border-zinc-100 p-6 rounded-[2.5rem] shadow-xl shadow-zinc-200/20 group relative overflow-hidden"
        >
            <div className="absolute -right-6 -top-6 text-zinc-50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Truck size={120} />
            </div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={cn("p-4 rounded-2xl border flex items-center justify-center shadow-inner bg-white", 
                    vehicle.status === 'in_maintenance' ? "text-amber-500 border-amber-100" : "text-emerald-500 border-emerald-100")}>
                    <Truck size={24} />
                </div>
                <div className={cn("px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border", statusColors[vehicle.status as keyof typeof statusColors] || statusColors.active)}>
                    {vehicle.status || "ACTIF"}
                </div>
            </div>

            <div className="mb-6 relative z-10">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-zinc-900 leading-none">{vehicle.name}</h3>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{vehicle.registration_number || "WS-742-CL"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[8px] font-black uppercase text-zinc-400">
                        <span className="flex items-center gap-1"><Battery size={10} /> ÉNERGIE</span>
                        <span className={cn(batteryLevel < 20 ? "text-red-500" : "text-emerald-500")}>{batteryLevel}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-50 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${batteryLevel}%` }}
                            className={cn("h-full rounded-full", batteryLevel < 20 ? "bg-red-500" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]")} 
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[8px] font-black uppercase text-zinc-400">
                        <span className="flex items-center gap-1"><Activity size={10} /> CHARGE</span>
                        <span className="text-zinc-900">{loadLevel}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-50 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${loadLevel}%` }}
                            className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                        />
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-zinc-50 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <User size={12} />
                    </div>
                    <span className="text-[9px] font-black text-zinc-500 uppercase">{vehicle.driver_name || "Agent Non-Assigné"}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-500">
                    <MapPin size={10} />
                    <span className="text-[9px] font-black uppercase">Live</span>
                </div>
            </div>
        </motion.div>
    );
}

/**
 * MaintenanceIntel: Vue d'ensemble de l'état technique de la flotte
 */
export function MaintenanceIntel({ vehicles }: { vehicles: any[] }) {
    const maintenanceNeeded = vehicles.filter(v => v.status === 'in_maintenance').length;
    const criticalHealth = vehicles.filter(v => {
        if (!v.next_maintenance_date) return false;
        const days = Math.floor((new Date(v.next_maintenance_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return days < 7;
    }).length;

    return (
        <div className="bg-zinc-900 text-white p-8 rounded-[3rem] shadow-2xl shadow-zinc-900/40 relative overflow-hidden group">
            <Wrench size={160} className="absolute -right-10 -bottom-10 text-white/5 rotate-12 transition-transform group-hover:scale-110" />
            
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-emerald-500 border border-white/10 shadow-xl">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black italic uppercase tracking-tighter leading-none">États Maintenance</h3>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">SANTÉ FLOTTE GLOBALE</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Unités Opérationnelles</span>
                        </div>
                        <span className="text-xl font-black italic">{vehicles.filter(v => v.status === 'active').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Révisions Requises</span>
                        </div>
                        <span className="text-xl font-black italic text-amber-500">{criticalHealth}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Immobilisations</span>
                        </div>
                        <span className="text-xl font-black italic text-red-500">{maintenanceNeeded}</span>
                    </div>
                </div>

                <button className="w-full mt-10 py-5 bg-white text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-xl">
                    Registre de Maintenance
                </button>
            </div>
        </div>
    );
}

/**
 * TelemetryFeed: Journal live des logs de la flotte
 */
export function TelemetryFeed() {
    const logs = [
        { id: 1, v: "V-01", msg: "Connecté au réseau GPS Crystal", time: "14:22", type: "system" },
        { id: 2, v: "V-03", msg: "Dépassement de zone (Nord)", time: "14:20", type: "alert" },
        { id: 3, v: "V-01", msg: "Chargement terminé à Treichville", time: "14:15", type: "event" },
        { id: 4, v: "V-02", msg: "Alerte batterie faible (15%)", time: "14:12", type: "critical" },
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6 flex items-center gap-3 italic">
                <Navigation size={12} className="text-emerald-500" /> TÉLÉMÉTRIE EN DIRECT
            </h3>
            <div className="space-y-3">
                {logs.map(log => (
                    <div key={log.id} className="p-4 bg-white/50 border border-zinc-100 rounded-2xl flex items-center justify-between group hover:bg-white hover:border-emerald-500/20 transition-all">
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black text-zinc-900 bg-zinc-100 px-2 py-1 rounded-lg">{log.v}</span>
                            <span className={cn("text-[10px] font-bold uppercase tracking-tight", 
                                log.type === 'alert' ? "text-amber-600" : log.type === 'critical' ? "text-red-500" : "text-zinc-500"
                            )}>
                                {log.msg}
                            </span>
                        </div>
                        <span className="text-[8px] font-mono text-zinc-300">{log.time}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * RouteOptimizationOverlay: Visualisation SVG des trajets IA
 */
export function RouteOptimizationOverlay() {
    return (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            <svg className="w-full h-full opacity-40">
                <motion.path 
                    d="M 100 100 Q 250 50 400 150 T 700 100"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeDasharray="10,10"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.circle r="6" fill="#10b981">
                    <animateMotion dur="3s" repeatCount="indefinite" path="M 100 100 Q 250 50 400 150 T 700 100" />
                </motion.circle>
                
                <motion.path 
                    d="M 200 400 S 500 200 800 500"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    strokeDasharray="10,10"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 4, repeat: Infinity }}
                />
            </svg>
        </div>
    );
}
