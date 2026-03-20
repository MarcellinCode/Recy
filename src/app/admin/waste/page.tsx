"use client";

import { 
    Trash2, 
    Plus, 
    Search, 
    Filter,
    Activity,
    CheckCircle2,
    Calendar,
    ArrowUpRight,
    Package,
    ShieldCheck,
    Banknote,
    Zap,
    Scale,
    Layers,
    MoreVertical
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";
import { motion } from "framer-motion";
import { Modal } from "@/components/ui/Modal";

type WasteType = {
    id: string;
    name: string;
    price_per_kg: number;
    emoji: string;
};

export default function WasteManagementPage() {
    const [loading, setLoading] = useState(true);
    const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<WasteType | null>(null);
    const [newType, setNewType] = useState({ name: "", price_per_kg: 0, emoji: "♻️" });
    const supabase = createClient();

    useEffect(() => {
        fetchWasteTypes();
    }, []);

    async function fetchWasteTypes() {
        setLoading(true);
        const { data, error } = await supabase
            .from('waste_types')
            .select('*')
            .order('name');
        
        if (error) {
            showToast("Erreur de chargement", "error");
        } else {
            setWasteTypes(data || []);
        }
        setLoading(false);
    }

    async function handleAddType(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await supabase.from('waste_types').insert([newType]);
        if (error) {
            showToast("Erreur lors de l'ajout", "error");
        } else {
            showToast("Nouveau type de déchet ajouté", "success");
            setIsAddModalOpen(false);
            setNewType({ name: "", price_per_kg: 0, emoji: "♻️" });
            fetchWasteTypes();
        }
    }

    async function handleUpdateType(e: React.FormEvent) {
        e.preventDefault();
        if (!editingType) return;

        const { error } = await supabase
            .from('waste_types')
            .update({
                name: editingType.name,
                price_per_kg: editingType.price_per_kg,
                emoji: editingType.emoji
            })
            .eq('id', editingType.id);

        if (error) {
            showToast("Erreur lors de la mise à jour", "error");
        } else {
            showToast("Type de déchet mis à jour", "success");
            setEditingType(null);
            fetchWasteTypes();
        }
    }

    async function deleteType(id: string) {
        if (!confirm("Supprimer ce type de déchet ? Cela peut affecter les transactions passées.")) return;
        const { error } = await supabase.from('waste_types').delete().eq('id', id);
        if (error) showToast("Erreur", "error");
        else {
            showToast("Type supprimé");
            fetchWasteTypes();
        }
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                        Catalogue des <span className="text-primary tracking-tighter">Matériaux</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Paramétrage des types de déchets et prix de rachat</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/20"
                >
                    <Plus size={16} />
                    Nouveau Matériau
                </button>
            </header>

            {/* Waste Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                ) : (
                    wasteTypes.map((type, i) => (
                    <motion.div 
                        key={type.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm group hover:border-primary/40 transition-all"
                    >
                        <div className="flex items-start justify-between mb-8">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-center text-4xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-transform group-hover:scale-110">
                                {type.emoji}
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteType(type.id);
                                    }}
                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                    title="Supprimer ce matériau"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingType(type);
                                    }}
                                    className="p-2 text-gray-300 hover:text-primary transition-colors"
                                    title="Modifier ce matériau"
                                >
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-2">{type.name}</h3>
                        
                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex-1 p-4 bg-gray-50/50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800/50">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Rachat / Kg</p>
                                <p className="text-lg font-black text-primary italic leading-none">{type.price_per_kg} <span className="text-[10px] opacity-60">FCFA</span></p>
                            </div>
                            <div className="flex-1 p-4 bg-gray-50/50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800/50">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Impact CO2</p>
                                <p className="text-lg font-black text-emerald-500 italic leading-none">2.4 <span className="text-[10px] opacity-60">Kg</span></p>
                            </div>
                        </div>

                        <button className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                            Statistiques de collecte
                        </button>
                    </motion.div>
                )))}
            </div>

            {/* Add Waste Type Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Ajouter un type de déchet"
            >
                <form onSubmit={handleAddType} className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2 col-span-1">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Emoji</label>
                             <input 
                                required
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-2xl text-center outline-none" 
                                value={newType.emoji}
                                onChange={(e) => setNewType({...newType, emoji: e.target.value})}
                             />
                        </div>
                        <div className="space-y-2 col-span-3">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom du matériau</label>
                             <input 
                                required
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-sm outline-none font-black uppercase" 
                                placeholder="PLASTIQUE PET..."
                                value={newType.name}
                                onChange={(e) => setNewType({...newType, name: e.target.value})}
                             />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Prix par Kilo (FCFA)</label>
                        <div className="relative">
                            <Scale className="absolute left-6 top-1/2 -translate-y-1/2 text-primary" size={20} />
                            <input 
                                required
                                type="number"
                                className="w-full pl-16 pr-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-xl font-black text-gray-900 dark:text-white outline-none" 
                                placeholder="150"
                                value={newType.price_per_kg}
                                onChange={(e) => setNewType({...newType, price_per_kg: Number(e.target.value)})}
                            />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        className="w-full py-5 bg-gray-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10 mt-4"
                    >
                        Enregistrer dans le catalogue
                    </button>
                </form>
            </Modal>

            {/* Edit Waste Type Modal */}
            <Modal
                isOpen={!!editingType}
                onClose={() => setEditingType(null)}
                title="Modifier le Type de Déchet"
            >
                {editingType && (
                    <form onSubmit={handleUpdateType} className="space-y-6">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2 col-span-1">
                                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Emoji</label>
                                 <input 
                                    required
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-2xl text-center outline-none" 
                                    value={editingType.emoji}
                                    onChange={(e) => setEditingType({...editingType, emoji: e.target.value})}
                                 />
                            </div>
                            <div className="space-y-2 col-span-3">
                                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom du matériau</label>
                                 <input 
                                    required
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-sm outline-none font-black uppercase" 
                                    value={editingType.name}
                                    onChange={(e) => setEditingType({...editingType, name: e.target.value})}
                                 />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Prix par Kilo (FCFA)</label>
                            <div className="relative">
                                <Scale className="absolute left-6 top-1/2 -translate-y-1/2 text-primary" size={20} />
                                <input 
                                    required
                                    type="number"
                                    className="w-full pl-16 pr-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-xl font-black text-gray-900 dark:text-white outline-none" 
                                    value={editingType.price_per_kg}
                                    onChange={(e) => setEditingType({...editingType, price_per_kg: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                        <button 
                            type="submit"
                            className="w-full py-5 bg-primary text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/10 mt-4"
                        >
                            Mettre à jour le catalogue
                        </button>
                    </form>
                )}
            </Modal>
        </div>
    );
}
