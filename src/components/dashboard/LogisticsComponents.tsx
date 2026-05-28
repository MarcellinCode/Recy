"use client";
 
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
    Truck, 
    Battery, 
    Wrench, 
    User, 
    MapPin, 
    Activity,
    Navigation,
    TrendingUp
} from "lucide-react";

interface Vehicle {
    readonly id: string;
    readonly name: string;
    readonly registration_number?: string;
    readonly status?: string;
    readonly battery_level?: number;
    readonly load_level?: number;
    readonly driver_name?: string;
    readonly next_maintenance_date?: string | Date;
}

function getLogColorClass(type: string): string {
    if (type === 'alert') {
        return "text-amber-500";
    }
    if (type === 'critical') {
        return "text-red-500";
    }
    return "text-zinc-400 group-hover:text-white";
}
 
/**
 * VehicleCard: Carte de télémétrie haute densité Midnight pour une unité de la flotte
 */
export function VehicleCard({ vehicle, position }: Readonly<{ vehicle: Vehicle, position?: any }>) {
    const seed = vehicle.id ? Number.parseInt(vehicle.id.split('-')[0], 16) : 42;
    const batteryLevel = vehicle.battery_level ?? (seed % 40 + 60);
    const loadLevel = vehicle.load_level ?? (seed % 50 + 20);
    
    const statusColors = {
        active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        en_mouvement: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        en_maintenance: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        out_of_service: "text-red-400 bg-red-500/10 border-red-500/20"
    };
 
    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="bg-gradient-to-br from-emerald-950/90 via-slate-900/95 to-slate-950/90 border border-emerald-500/15 p-7 rounded-[2.5rem] shadow-2xl group relative overflow-hidden transition-all hover:border-emerald-500/30 backdrop-blur-xl"
        >
            <div className="absolute -right-6 -top-6 text-white opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Truck size={140} />
            </div>
 
            <div className="flex justify-between items-start mb-8 relative z-10">
                <div className={cn("w-14 h-14 rounded-2xl border flex items-center justify-center shadow-2xl bg-emerald-950/50 backdrop-blur-sm", 
                    vehicle.status === 'in_maintenance' ? "text-amber-500 border-amber-500/20" : "text-emerald-500 border-emerald-500/20")}>
                    <Truck size={28} />
                </div>
                <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border", statusColors[vehicle.status as keyof typeof statusColors] || statusColors.active)}>
                    {vehicle.status || "ACTIF"}
                </div>
            </div>
 
            <div className="mb-8 relative z-10">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none mb-2">{vehicle.name}</h3>
                <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">{vehicle.registration_number || "WS-742-CL"}</p>
            </div>
 
            <div className="grid grid-cols-1 gap-6 mb-8 relative z-10">
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-zinc-400 tracking-widest">
                        <span className="flex items-center gap-2"><Battery size={12} className="text-emerald-500" /> ÉNERGIE BATT.</span>
                        <span className={cn(batteryLevel < 20 ? "text-red-500" : "text-emerald-400")}>{batteryLevel}%</span>
                    </div>
                    <div className="h-2 bg-emerald-950/60 rounded-full overflow-hidden border border-emerald-500/10">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${batteryLevel}%` }}
                            className={cn("h-full rounded-full transition-all duration-1000", batteryLevel < 20 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]")} 
                        />
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-zinc-400 tracking-widest">
                        <span className="flex items-center gap-2"><Activity size={12} className="text-blue-550" /> CHARGE UTILE</span>
                        <span className="text-blue-400">{loadLevel}%</span>
                    </div>
                    <div className="h-2 bg-emerald-950/60 rounded-full overflow-hidden border border-emerald-500/10">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${loadLevel}%` }}
                            className="h-full bg-blue-550 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" 
                        />
                    </div>
                </div>
            </div>
 
            <div className="pt-6 border-t border-emerald-500/10 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-950/40 border border-emerald-500/10 flex items-center justify-center text-emerald-300">
                        <User size={14} />
                    </div>
                    <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tight">{vehicle.driver_name || "Agent Non-Assigné"}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500 group-hover:scale-110 transition-transform">
                    <MapPin size={12} />
                    <span className="text-[10px] font-black uppercase italic">LIVE TRACK</span>
                </div>
            </div>
        </motion.div>
    );
}
 
/**
 * MaintenanceIntel: Vue d'ensemble de l'état technique Midnight
 */
export function MaintenanceIntel({ vehicles }: Readonly<{ vehicles: readonly Vehicle[] }>) {
    const maintenanceNeeded = vehicles.filter(v => v.status === 'in_maintenance').length;
    const criticalHealth = vehicles.filter(v => {
        if (!v.next_maintenance_date) return false;
        const days = Math.floor((new Date(v.next_maintenance_date).getTime() - Date.now()) / (1000 * 3600 * 24));
        return days < 7;
    }).length;
 
    return (
        <div className="bg-gradient-to-br from-emerald-950/90 via-slate-900/95 to-slate-950/90 border border-emerald-500/15 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group backdrop-blur-xl">
            <Wrench size={180} className="absolute -right-12 -bottom-12 text-white/5 rotate-12 transition-transform group-hover:scale-110" />
            
            <div className="relative z-10">
                <div className="flex items-center gap-5 mb-10">
                    <div className="w-14 h-14 bg-emerald-500/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-xl">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none text-white">Santé Flotte</h3>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-2">ANALYSE TÉLÉMÉTRIQUE</p>
                    </div>
                </div>
 
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300">Opérationnels</span>
                        </div>
                        <span className="text-2xl font-black italic text-white">{vehicles.filter(v => v.status === 'active' || v.status === 'en_mouvement').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300">Révisions</span>
                        </div>
                        <span className="text-2xl font-black italic text-amber-500">{criticalHealth}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300">Immobilisés</span>
                        </div>
                        <span className="text-2xl font-black italic text-red-500">{maintenanceNeeded}</span>
                    </div>
                </div>
 
                <Link href="/flotte" className="block w-full mt-12">
                    <button className="w-full py-6 bg-emerald-950/50 backdrop-blur-sm border border-emerald-500/20 text-emerald-200 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all shadow-xl">
                        Registre de Maintenance
                    </button>
                </Link>
            </div>
        </div>
    );
}
 
/**
 * TelemetryFeed: Journal live Midnight des logs de la flotte
 */
export function TelemetryFeed() {
    const logs = [
        { id: 1, v: "V-01", msg: "RÉSEAU GPS CRYSTAL CONNECTÉ", time: "14:22", type: "system" },
        { id: 2, v: "V-03", msg: "DÉPASSEMENT ZONE GÉO-FENCE", time: "14:20", type: "alert" },
        { id: 3, v: "V-01", msg: "COLLECTE VALIDÉE : TREICHVILLE", time: "14:15", type: "event" },
        { id: 4, v: "V-02", msg: "CRITIQUE : BATT. FAIBLE (15%)", time: "14:12", type: "critical" },
    ];
 
    return (
        <div className="space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-8 flex items-center gap-4 italic">
                <Navigation size={14} className="animate-pulse" /> TÉLÉMÉTRIE TEMPS RÉEL
            </h3>
            <div className="space-y-4">
                {logs.map(log => (
                    <div key={log.id} className="p-5 bg-emerald-950/60 backdrop-blur-sm border border-emerald-500/10 rounded-3xl flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-xl">
                        <div className="flex items-center gap-5">
                            <span className="text-[10px] font-black text-emerald-200 bg-emerald-950/80 border border-emerald-500/25 px-3 py-1.5 rounded-xl">{log.v}</span>
                            <span className={cn("text-[10px] font-black uppercase tracking-tight transition-colors", 
                                getLogColorClass(log.type)
                            )}>
                                {log.msg}
                            </span>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-550 group-hover:text-emerald-400 transition-colors">{log.time}</span>
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
            <svg className="w-full h-full opacity-30">
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
