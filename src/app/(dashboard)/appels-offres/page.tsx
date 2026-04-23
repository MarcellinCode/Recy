"use client";

import { useState, useEffect } from "react";
import {
    Building2,
    Plus,
    Calendar,
    Weight,
    DollarSign,
    ChevronRight,
    Loader2,
    Info,
    Clock
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

export default function BulkMarketplacePage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [requests, setRequests] = useState<any[]>([]);
    const [wasteTypes, setWasteTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [newRequest, setNewRequest] = useState({
        waste_type_id: "",
        quantity: "",
        target_price: "",
        deadline: "",
        description: ""
    });

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setProfile(prof);
            }

            const { data: types } = await supabase.from('waste_types').select('*');
            setWasteTypes(types || []);

            const { data: reqs } = await supabase
                .from('bulk_requests')
                .select('*, profiles(full_name), waste_types(name)')
                .eq('status', 'open')
                .order('created_at', { ascending: false });

            setRequests(reqs || []);
            setLoading(false);
        };
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        const { error } = await supabase.from('bulk_requests').insert({
            company_id: user.id,
            ...newRequest,
            quantity: parseFloat(newRequest.quantity),
            target_price: newRequest.target_price ? parseFloat(newRequest.target_price) : null
        });

        if (error) {
            showToast("Erreur lors de la publication", "error");
        } else {
            showToast("Appel d'offre publié avec succès !", "success");
            setShowForm(false);
            setNewRequest({ waste_type_id: "", quantity: "", target_price: "", deadline: "", description: "" });
            // Reload
            const { data } = await supabase
                .from('bulk_requests')
                .select('*, profiles(full_name), waste_types(name)')
                .order('created_at', { ascending: false });
            setRequests(data || []);
        }
        setLoading(false);
    };

    if (loading && requests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Chargement du marché B2B...</p>
            </div>
        );
    }

    const isCompany = profile?.role === 'entreprise';

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16 underline-offset-8">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <h1 className="text-xs font-black text-primary uppercase tracking-[0.4em]">Marché B2B / Bulk</h1>
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                        Appels d'offres <span className="text-primary italic">Industriels</span>
                    </h2>
                </div>

                {isCompany && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-3 px-8 py-4 bg-zinc-900 dark:bg-zinc-800 text-white font-black rounded-3xl hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 uppercase tracking-widest text-xs"
                    >
                        {showForm ? <Plus className="w-5 h-5 rotate-45" /> : <Plus className="w-5 h-5" />}
                        {showForm ? "Fermer" : "Nouvel Appel d'Offres"}
                    </button>
                )}
            </header>

            {showForm && (
                <div className="bg-white dark:bg-zinc-900 border-2 border-primary/20 rounded-[3rem] p-10 mb-16 animate-in slide-in-from-top duration-500">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-3">
                            <label htmlFor="wasteType" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Matière demandée</label>
                            <select
                                id="wasteType"
                                required
                                value={newRequest.waste_type_id}
                                onChange={(e) => setNewRequest({ ...newRequest, waste_type_id: e.target.value })}
                                className="w-full p-5 bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold appearance-none"
                            >
                                <option value="">Sél. le type</option>
                                {wasteTypes.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label htmlFor="quantity" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantité (kg)</label>
                            <div className="relative">
                                <Weight className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="quantity"
                                    type="number"
                                    required
                                    placeholder="Ex: 5000"
                                    value={newRequest.quantity}
                                    onChange={(e) => setNewRequest({ ...newRequest, quantity: e.target.value })}
                                    className="w-full p-5 pl-14 bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label htmlFor="targetPrice" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prix Target (Optionnel)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="targetPrice"
                                    type="number"
                                    placeholder="Prix au kg"
                                    value={newRequest.target_price}
                                    onChange={(e) => setNewRequest({ ...newRequest, target_price: e.target.value })}
                                    className="w-full p-5 pl-14 bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label htmlFor="deadline" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date limite de collecte</label>
                            <div className="relative">
                                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="deadline"
                                    type="date"
                                    required
                                    value={newRequest.deadline}
                                    onChange={(e) => setNewRequest({ ...newRequest, deadline: e.target.value })}
                                    className="w-full p-5 pl-14 bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-3">
                            <label htmlFor="details" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Détails / Specifications techniques</label>
                            <input
                                id="details"
                                type="text"
                                placeholder="Couleur, pureté, emballage souhaité..."
                                value={newRequest.description}
                                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                                className="w-full p-5 bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                            />
                        </div>

                        <div className="lg:col-span-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-6 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all uppercase tracking-widest text-xs disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" /> : "Diffuser l'appel d'offre"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {requests.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border border-dashed border-gray-200 dark:border-zinc-800">
                        <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Aucun appel d'offre en cours</p>
                    </div>
                ) : (
                    requests.map((req) => (
                        <div
                            key={req.id}
                            className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 hover:border-primary/30 transition-all flex flex-col md:flex-row items-center justify-between gap-8 group"
                        >
                            <div className="flex items-center gap-6 w-full md:w-auto">
                                <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Weight className="w-10 h-10" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                                            {req.quantity}kg de {req.waste_types?.name}
                                        </h4>
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                            req.status === 'open' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                        )}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Building2 className="w-3 h-3" />
                                        {req.profiles?.full_name}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:flex items-center gap-6 md:gap-12 w-full md:w-auto">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Échéance</p>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-red-500" />
                                        {new Date(req.deadline).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Prix Indicatif</p>
                                    <p className="text-xs font-black text-primary">
                                        {req.target_price ? `${req.target_price} FCFA/kg` : "Non spécifié"}
                                    </p>
                                </div>
                            </div>

                            <button onClick={() => showToast('Bientôt disponible', 'success')} className="w-full md:w-auto px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[9px]">
                                {profile?.role === 'collecteur' ? "Répondre à l'offre" : "Détails"}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-20 p-12 bg-zinc-900 rounded-[3rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full"></div>
                <h4 className="text-xl font-black uppercase italic tracking-tighter mb-4">Besoin d'aide pour vos <span className="text-primary italic">Grands Volumes</span> ?</h4>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-2xl mb-8">
                    Notre équipe d'experts facilite les transactions massives pour garantir la traçabilité et la qualité industrielle.
                </p>
                <button onClick={() => showToast('Consultation gratuite à venir', 'success')} className="px-10 py-4 border-2 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                    Contacter un consultant CITICLINE
                </button>
            </div>
        </div>
    );
}

