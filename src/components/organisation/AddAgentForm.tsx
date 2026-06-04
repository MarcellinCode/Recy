"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { User, Phone, Mail, Truck, MapPin, ShieldCheck, CheckCircle2, ChevronDown, UserCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";
import { addAgent } from "@/app/actions/organisation";

interface AddAgentFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    vehicles: any[];
    concessions: any[];
}

export function AddAgentForm({ isOpen, onClose, onSuccess, vehicles, concessions }: AddAgentFormProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Form fields
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        email: "",
        role: "collector",
        vehicleId: "",
        zoneId: "",
        pin: ""
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.fullName || !formData.phone) {
                showToast("Veuillez remplir le nom et le téléphone", "error");
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (!formData.role || !formData.zoneId) {
                showToast("Veuillez choisir un rôle et une zone", "error");
                return;
            }
            setStep(3);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.pin || formData.pin.length < 4) {
            showToast("Un code PIN d'au moins 4 chiffres est requis", "error");
            return;
        }

        setLoading(true);

        try {
            const res = await addAgent(formData);
            
            if (res.success) {
                showToast("L'agent a été ajouté et notifié par SMS", "success");
                onSuccess(); // Actualiser fetchData()
                setFormData({
                    fullName: "",
                    phone: "",
                    email: "",
                    role: "collector",
                    vehicleId: "",
                    zoneId: "",
                    pin: ""
                });
                setStep(1);
                onClose();
            } else {
                showToast(res.error || "Erreur serveur", "error");
            }
        } catch (error) {
            showToast("Erreur lors de la création de l'agent", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Recruter un Agent Tactique">
            <div className="py-2">
                {/* Stepper */}
                <div className="flex justify-between mb-8 px-4">
                    {[
                        { num: 1, label: "Identité", icon: UserCircle },
                        { num: 2, label: "Affectation", icon: MapPin },
                        { num: 3, label: "Sécurité", icon: ShieldCheck }
                    ].map((s) => (
                        <div key={s.num} className="flex flex-col items-center gap-2">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center font-black transition-all",
                                step >= s.num ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-gray-100 dark:bg-zinc-800 text-zinc-400"
                            )}>
                                {step > s.num ? <CheckCircle2 size={18} /> : <span>{s.num}</span>}
                            </div>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest",
                                step >= s.num ? "text-primary" : "text-zinc-400"
                            )}>{s.label}</span>
                        </div>
                    ))}
                </div>

                <div className="relative min-h-[350px]">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-primary transition-colors">
                                            <User size={18} />
                                        </div>
                                        <input 
                                            placeholder="Nom complet de l'agent *"
                                            className="w-full pl-14 pr-6 py-5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 rounded-3xl text-sm outline-none font-black transition-all"
                                            value={formData.fullName}
                                            onChange={(e) => handleInputChange("fullName", e.target.value)}
                                        />
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-primary transition-colors">
                                            <Phone size={18} />
                                        </div>
                                        <input 
                                            placeholder="Numéro WhatsApp/Cellulaire *"
                                            type="tel"
                                            className="w-full pl-14 pr-6 py-5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 rounded-3xl text-sm outline-none font-black transition-all"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange("phone", e.target.value)}
                                        />
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-primary transition-colors">
                                            <Mail size={18} />
                                        </div>
                                        <input 
                                            placeholder="Adresse Email (Optionnelle)"
                                            type="email"
                                            className="w-full pl-14 pr-6 py-5 bg-gray-50 dark:bg-zinc-800/50 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-zinc-900 rounded-3xl text-sm outline-none font-black transition-all"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange("email", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={nextStep}
                                    className="w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg"
                                >
                                    Suivant
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { id: 'collector', label: 'Trieur / Collecteur' },
                                            { id: 'driver', label: 'Chauffeur Poids-lourd' }
                                        ].map(role => (
                                            <button
                                                key={role.id}
                                                onClick={() => handleInputChange('role', role.id)}
                                                className={cn(
                                                    "py-5 px-4 rounded-3xl border-2 text-[10px] font-black uppercase tracking-widest transition-all text-center flex flex-col items-center justify-center gap-2",
                                                    formData.role === role.id 
                                                        ? "border-primary bg-primary/5 text-primary" 
                                                        : "border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400 hover:border-zinc-300"
                                                )}
                                            >
                                                {role.id === 'driver' ? <Truck size={20} /> : <User size={20} />}
                                                {role.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-400">
                                            <MapPin size={18} />
                                        </div>
                                        <select 
                                            className="w-full pl-14 pr-12 py-5 sm:py-6 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 rounded-3xl text-sm outline-none font-black transition-all appearance-none uppercase"
                                            value={formData.zoneId}
                                            onChange={(e) => handleInputChange("zoneId", e.target.value)}
                                        >
                                            <option value="" disabled>Affecter à une Zone *</option>
                                            {concessions.map(c => (
                                                <option key={c.id} value={c.id}>{c.zones?.name || 'Zone Inconnue'}</option>
                                            ))}
                                            <option value="all">Zone Globale</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none text-zinc-400">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>

                                    {formData.role === 'driver' && (
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-400">
                                                <Truck size={18} />
                                            </div>
                                            <select 
                                                className="w-full pl-14 pr-12 py-5 sm:py-6 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 rounded-3xl text-sm outline-none font-black transition-all appearance-none uppercase"
                                                value={formData.vehicleId}
                                                onChange={(e) => handleInputChange("vehicleId", e.target.value)}
                                            >
                                                <option value="" disabled>Lier un véhicule (Optionnel)</option>
                                                {vehicles.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none text-zinc-400">
                                                <ChevronDown size={18} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setStep(1)}
                                        className="py-5 px-6 bg-gray-100 dark:bg-zinc-800/50 text-zinc-500 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                                    >
                                        Retour
                                    </button>
                                    <button 
                                        onClick={nextStep}
                                        className="flex-1 py-5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg"
                                    >
                                        Suivant
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="text-center bg-gray-50 dark:bg-zinc-800/50 p-6 mx-auto rounded-3xl border border-gray-100 dark:border-zinc-800 mb-6">
                                    <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
                                        <ShieldCheck size={28} className="text-primary" />
                                    </div>
                                    <h3 className="font-black italic uppercase tracking-tighter text-lg mb-2">Code d'accès mobile</h3>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest max-w-[250px] mx-auto">
                                        Ce code temporaire permettra à l'agent de se connecter sur l'application terrain CleanZone Operations.
                                    </p>
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-primary transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input 
                                        placeholder="Définir un Code PIN (ex: 1234) *"
                                        type="password"
                                        maxLength={6}
                                        className="w-full pl-14 pr-6 py-5 sm:py-6 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 rounded-3xl text-sm outline-none font-black text-center tracking-[0.5em] transition-all placeholder:text-zinc-400 placeholder:tracking-normal placeholder:text-left"
                                        value={formData.pin}
                                        onChange={(e) => handleInputChange("pin", e.target.value)}
                                    />
                                </div>
                                
                                <div className="flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="py-5 px-6 bg-gray-100 dark:bg-zinc-800/50 text-zinc-500 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                                    >
                                        Retour
                                    </button>
                                    <button 
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="flex-1 py-5 bg-primary text-white rounded-3xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden group"
                                    >
                                        {loading ? (
                                            <span className="animate-pulse">Création Opérationnelle...</span>
                                        ) : (
                                            <>
                                                Valider & Générer l'accès
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </Modal>
    );
}
