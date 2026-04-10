"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon, Activity } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * NeonCard: Une carte futuriste "Crystal" optimisée pour mode clair
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
        emerald: "border-emerald-500/20 text-emerald-600 shadow-emerald-500/5",
        blue: "border-blue-500/20 text-blue-600 shadow-blue-500/5",
        amber: "border-amber-500/20 text-amber-600 shadow-amber-500/5",
        red: "border-red-500/20 text-red-600 shadow-red-500/5"
    };

    const iconBgs = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        red: "bg-red-50 text-red-600 border-red-100"
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative group bg-white/80 backdrop-blur-xl border p-6 rounded-[2rem] overflow-hidden transition-all hover:bg-white shadow-xl shadow-zinc-200/50",
                colors[color],
                className
            )}
        >
            <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Icon size={120} />
            </div>
            
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-8">
                    <div className={cn("p-3 rounded-xl border", iconBgs[color])}>
                        <Icon size={20} />
                    </div>
                    {trend && (
                        <span className="text-[10px] font-black tracking-widest uppercase italic text-zinc-400">
                            {trend}
                        </span>
                    )}
                </div>
                
                <div>
                    <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                        {title}
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black italic tracking-tighter text-zinc-900">
                            {value}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Animated Glow Border subtle */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-[2px] rounded-[2rem] blur-[4px]",
                "border-" + color + "-500/20"
            )} />
        </motion.div>
    );
}

/**
 * HoloGauge: Jauge circulaire épurée pour mode clair
 */
export function HoloGauge({ value, label = "Souveraineté" }: { value: number, label?: string }) {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-64 h-64">
            {/* Background Circle */}
            <svg className="absolute w-full h-full rotate-[-90deg]">
                <circle
                    cx="128"
                    cy="128"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-zinc-100"
                />
                {/* Progress Circle */}
                <motion.circle
                    cx="128"
                    cy="128"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    strokeLinecap="round"
                />
            </svg>
            
            {/* Inner Content */}
            <div className="relative z-10 text-center">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-5xl font-black italic tracking-tighter text-zinc-900"
                >
                    {value}%
                </motion.div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mt-2">
                    {label}
                </div>
                <div className="flex justify-center gap-1 mt-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div 
                            key={i} 
                            className={cn(
                                "w-1 h-3 rounded-full",
                                i <= (value/20) ? "bg-emerald-500 animate-pulse scale-y-110" : "bg-zinc-100"
                            )} 
                        />
                    ))}
                </div>
            </div>
            
            {/* Decorative Scanning Line subtle */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-r border-emerald-500/10 rounded-full"
            />
        </div>
    );
}

/**
 * LiveTicker: Flux d'événements cristallin
 */
export function LiveTicker({ events }: { events: any[] }) {
    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden relative">
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="relative">
                    <Activity className="text-emerald-500" size={16} />
                    <div className="absolute inset-0 bg-emerald-500 blur-[8px] opacity-20 animate-pulse" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Live Intel Feed</h3>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar scroll-smooth">
                <AnimatePresence mode="popLayout">
                    {events.map((event, i) => (
                        <motion.div
                            key={event.id || i}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            className="bg-white/60 border-l-2 border-emerald-500 p-4 rounded-r-xl shadow-sm border border-zinc-100"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[8px] font-black text-emerald-600 tracking-widest uppercase">
                                    {event.type}
                                </span>
                                <span className="text-[8px] font-mono text-zinc-400">
                                    {new Date(event.timestamp || Date.now()).toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-zinc-600 leading-relaxed uppercase">
                                {event.message}
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>
    );
}

export function StatusIndicator({ label, status = "active" }: { label: string, status?: "active" | "warning" | "error" }) {
    const colors = {
        active: "bg-emerald-500 shadow-emerald-500/30",
        warning: "bg-amber-500 shadow-amber-500/30",
        error: "bg-red-500 shadow-red-500/30"
    };

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-100 rounded-full shadow-sm">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", colors[status])} />
            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400">{label}</span>
        </div>
    );
}
