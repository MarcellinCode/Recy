"use client";
 
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon, Activity } from "lucide-react";
 
interface EventType {
    readonly id?: string | number;
    readonly type?: string;
    readonly timestamp?: string | number | Date;
    readonly message?: string;
}

/**
 * NeonCard: Une carte futuriste "Souveraine" optimisée pour mode sombre
 */
export function NeonCard({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    className, 
    color = "emerald" 
}: Readonly<{ 
    title: string; 
    value: string | number; 
    icon: LucideIcon; 
    trend?: string;
    className?: string;
    color?: "emerald" | "blue" | "amber" | "red";
}>) {
    const colors = {
        emerald: "bg-gradient-to-br from-emerald-950/90 via-slate-900/95 to-emerald-950/90 border-emerald-500/25 text-emerald-300 shadow-xl shadow-emerald-950/30",
        blue: "bg-gradient-to-br from-blue-950/90 via-slate-900/95 to-blue-950/90 border-blue-500/25 text-blue-300 shadow-xl shadow-blue-950/30",
        amber: "bg-gradient-to-br from-amber-950/90 via-slate-900/95 to-amber-950/90 border-amber-500/25 text-amber-300 shadow-xl shadow-amber-950/30",
        red: "bg-gradient-to-br from-red-950/90 via-slate-900/95 to-red-950/90 border-red-500/25 text-red-300 shadow-xl shadow-red-950/30"
    };
 
    const iconBgs = {
        emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        red: "bg-red-500/10 text-red-400 border-red-500/20"
    };
 
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative group border p-6 rounded-[2.5rem] overflow-hidden transition-all hover:border-emerald-500/40 shadow-2xl backdrop-blur-xl",
                colors[color],
                className
            )}
        >
            <div className="absolute -right-4 -top-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                <Icon size={120} />
            </div>
            
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-8">
                    <div className={cn("p-3 rounded-2xl border", iconBgs[color])}>
                        <Icon size={20} />
                    </div>
                    {trend && (
                        <span className="text-[10px] font-black tracking-widest uppercase italic text-zinc-400/70">
                            {trend}
                        </span>
                    )}
                </div>
                
                <div>
                    <h3 className="text-zinc-450 text-[10px] font-black uppercase tracking-[0.3em] mb-1">
                        {title}
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black italic tracking-tighter text-white text-shadow-glow">
                            {value}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-[1px] rounded-[2.5rem] blur-[2px]",
                "border-" + color + "-500/40"
            )} />
        </motion.div>
    );
}
 
/**
 * HoloGauge: Jauge circulaire haute visibilité pour mode sombre
 */
export function HoloGauge({ value, label = "Souveraineté" }: Readonly<{ value: number, label?: string }>) {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
 
    return (
        <div className="relative flex items-center justify-center w-64 h-64 group">
            {/* Background Circle */}
            <svg className="absolute w-full h-full rotate-[-90deg]">
                <circle
                    cx="128"
                    cy="128"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-emerald-500/10"
                />
                {/* Progress Circle */}
                <motion.circle
                    cx="128"
                    cy="128"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    strokeLinecap="round"
                />
            </svg>
            
            {/* Inner Content */}
            <div className="relative z-10 text-center">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-6xl font-black italic tracking-tighter text-white text-shadow-glow-emerald"
                >
                    {value}<span className="text-2xl opacity-30">%</span>
                </motion.div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mt-2">
                    {label}
                </div>
                <div className="flex justify-center gap-1.5 mt-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div 
                            key={i} 
                            className={cn(
                                "w-1.5 h-4 rounded-full transition-all duration-500",
                                i <= (value/20) ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-emerald-950/50"
                            )} 
                        />
                    ))}
                </div>
            </div>
            
            {/* Scanning Effect */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-r border-emerald-500/20 rounded-full blur-[1px]"
            />
        </div>
    );
}
 
/**
 * LiveTicker: Flux d'événements néon haute visibilité
 */
export function LiveTicker({ events }: Readonly<{ events: readonly EventType[] }>) {
    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden relative">
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="relative">
                    <Activity className="text-emerald-500" size={16} />
                    <div className="absolute inset-0 bg-emerald-500 blur-[8px] opacity-40 animate-pulse" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600/80">Live Intel Feed</h3>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar scroll-smooth pb-10">
                <AnimatePresence mode="popLayout">
                    {events.map((event, i) => (
                        <motion.div
                            key={event.id || i}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            className="bg-emerald-950/80 backdrop-blur-md border-l-4 border-emerald-500 p-5 rounded-r-2xl shadow-xl border border-emerald-500/10 group hover:border-emerald-500/30 transition-all"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black text-emerald-400 tracking-widest uppercase italic">
                                    {event.type}
                                </span>
                                <span className="text-[8px] font-mono text-emerald-350/50">
                                    {new Date(event.timestamp || Date.now()).toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-emerald-100 leading-relaxed uppercase group-hover:text-white transition-colors">
                                {event.message}
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
        </div>
    );
}
 
export function StatusIndicator({ label, status = "active" }: Readonly<{ label: string, status?: "active" | "warning" | "error" }>) {
    const colors = {
        active: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
        warning: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
        error: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
    };
 
    return (
        <div className="flex items-center gap-3 px-5 py-3 bg-slate-900/90 backdrop-blur-md border border-emerald-500/10 rounded-2xl shadow-lg hover:border-emerald-500/20 transition-colors">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", colors[status])} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-150">{label}</span>
        </div>
    );
}
