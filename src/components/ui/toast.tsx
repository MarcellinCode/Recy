"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error";

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={cn(
            "fixed top-4 right-4 z-[9999] flex items-center gap-4 px-6 py-4 rounded-[2rem] shadow-2xl border backdrop-blur-md animate-in slide-in-from-right-10 duration-500",
            type === "success"
                ? "bg-primary/95 border-primary/20 text-white"
                : "bg-red-600/95 border-red-500/20 text-white"
        )}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                {type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <p className="text-xs font-black uppercase tracking-widest">{message}</p>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors ml-2">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

let toastFn: (message: string, type: ToastType) => void;

export const showToast = (message: string, type: ToastType = "success") => {
    if (toastFn) toastFn(message, type);
};

export function ToastProvider() {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const show = useCallback((message: string, type: ToastType) => {
        setToast({ message, type });
    }, []);

    useEffect(() => {
        toastFn = show;
    }, [show]);

    if (!toast) return null;

    return (
        <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
        />
    );
}
