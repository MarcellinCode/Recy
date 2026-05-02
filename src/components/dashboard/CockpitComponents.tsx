"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon, Activity } from "lucide-react";
import { useEffect, useState } from "react";

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
}: { 
    title: string; 
    value: string | number; 
    icon: LucideIcon; 
    trend?: string;
    className?: string;
    color?: "emerald" | "blue" | "amber" | "red";
}) {
    const colors = {
        emerald: "border-emerald-500/20 text-emerald-400 shadow-emerald-500/5",
        blue: "border-blue-500/20 text-blue-400 shadow-blue-500/5",
        amber: "border-amber-500/20 text-amber-400 shadow-amber-500/5",
        red: "border-red-500/20 text-red-400 shadow-red-500/5"
    };

    const iconBgs = {
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        red: "bg-red-500/10 text-red-500 border-red-500/20"
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative group bg-zinc-900 border p-6 rounded-[2.5rem] overflow-hidden transition-all hover:border-emerald-500/30 shadow-2xl",
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
                        <span className="text-[10px] font-black tracking-widest uppercase italic text-zinc-500">
                            {trend}
                        </span>
                    )}
                </div>
                
                <div>
                    <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-1">
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
export function HoloGauge({ value, label = "Souveraineté" }: { value: number, label?: string }) {
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
                    className="text-white/5"
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
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mt-2">
                    {label}
                </div>
                <div className="flex justify-center gap-1.5 mt-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div 
                            key={i} 
                            className={cn(
                                "w-1.5 h-4 rounded-full transition-all duration-500",
                                i <= (value/20) ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-zinc-800"
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
export function LiveTicker({ events }: { events: any[] }) {
    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden relative">
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="relative">
                    <Activity className="text-emerald-500" size={16} />
                    <div className="absolute inset-0 bg-emerald-500 blur-[8px] opacity-40 animate-pulse" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/70">Live Intel Feed</h3>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar scroll-smooth pb-10">
                <AnimatePresence mode="popLayout">
                    {events.map((event, i) => (
                        <motion.div
                            key={event.id || i}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            className="bg-zinc-900 border-l-4 border-emerald-500 p-5 rounded-r-2xl shadow-2xl border border-white/5 group hover:border-emerald-500/30 transition-all"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black text-emerald-400 tracking-widest uppercase italic">
                                    {event.type}
                                </span>
                                <span className="text-[8px] font-mono text-zinc-500">
                                    {new Date(event.timestamp || Date.now()).toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-zinc-300 leading-relaxed uppercase group-hover:text-white transition-colors">
                                {event.message}
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
        </div>
    );
}

export function StatusIndicator({ label, status = "active" }: { label: string, status?: "active" | "warning" | "error" }) {
    const colors = {
        active: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
        warning: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
        error: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
    };

    return (
        <div className="flex items-center gap-3 px-5 py-3 bg-zinc-900 border border-white/5 rounded-2xl shadow-xl hover:border-white/10 transition-colors">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", colors[status])} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</span>
        </div>
    );
}
