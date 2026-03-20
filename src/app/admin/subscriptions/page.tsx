"use client";

import { 
    Users, 
    CreditCard, 
    Zap, 
    TrendingUp, 
    Search, 
    Filter,
    Plus,
    Activity,
    CheckCircle2,
    Calendar,
    ArrowUpRight,
    Package,
    ShieldCheck
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";
import { motion } from "framer-motion";
import { Modal } from "@/components/ui/Modal";

export default function SubscriptionsPage() {
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [concessions, setConcessions] = useState<any[]>([]);
    const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
    const [newPlan, setNewPlan] = useState({ 
        name: "", 
        price_cfa: 0, 
        concession_id: "",
        frequency_per_week: 1 
    });
    const supabase = createClient();

    useEffect(() => {
        fetchSubData();
    }, []);

    async function fetchSubData() {
        setLoading(true);
        try {
            const { data: plansData } = await supabase.from('subscription_plans').select('*, concessions(zones(name))');
            const { data: subsData } = await supabase.from('household_subscriptions').select('*, profiles(full_name, email), subscription_plans(name, price_cfa)');
            const { data: concData } = await supabase.from('concessions').select('*, zones(name), profiles(full_name)').eq('status', 'active');
            
            setPlans(plansData || []);
            setSubscriptions(subsData || []);
            setConcessions(concData || []);
            if (concData && concData.length > 0) setNewPlan(p => ({ ...p, concession_id: concData[0].id }));
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }

    async function handleCreatePlan(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await supabase.from('subscription_plans').insert([newPlan]);
        if (error) {
            showToast("Erreur lors de la création", "error");
        } else {
            showToast("Plan d'abonnement publié", "success");
            setIsAddPlanModalOpen(false);
            setNewPlan({ name: "", price_cfa: 0, concession_id: concessions[0]?.id || "", frequency_per_week: 1 });
            fetchSubData();
        }
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                        Économie <span className="text-primary tracking-tighter">Récurrente</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Gestion des forfaits Citoyen et revenus d'abonnement</p>
                </div>
                <button 
                    onClick={() => setIsAddPlanModalOpen(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/20"
                >
                    <Plus size={16} />
                    Nouveau Plan
                </button>
            </header>

            {/* Subscription KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Abonnés Actifs", value: subscriptions.length, sub: "+12.5%", color: "text-emerald-500" },
                    { label: "MRR (Est.)", value: (subscriptions.reduce((acc, s) => acc + (s.subscription_plans?.price_cfa || 0), 0)).toLocaleString(), sub: "FCFA / Mois", color: "text-primary" },
                    { label: "Taux de Churn", value: "2.4%", sub: "-0.5% vs mois d'avant", color: "text-blue-500" },
                    { label: "Plans Actifs", value: plans.length, sub: "Vérifiés", color: "text-amber-500" },
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm"
                    >
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
                        <p className={cn("text-2xl font-black italic tracking-tighter mb-1", stat.color)}>{stat.value}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">{stat.sub}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Plans List */}
                <div className="xl:col-span-1 space-y-6">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-2">
                        <Package className="text-primary" size={20} />
                        Plans Disponibles
                    </h2>
                    <div className="space-y-4">
                        {plans.length > 0 ? plans.map((plan: any) => (
                            <div key={plan.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-zinc-800 shadow-sm hover:border-primary/30 transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-primary">
                                        <Zap size={20} />
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-2 py-0.5 bg-emerald-50 rounded-lg">Actif</span>
                                </div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase mb-1">{plan.name}</h3>
                                <p className="text-2xl font-black text-primary italic mb-4">{plan.price?.toLocaleString()} <span className="text-[10px]">CFA</span></p>
                                <div className="space-y-2 mb-6">
                                     <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase"><CheckCircle2 size={12} className="text-emerald-500" /> 1 Ramassage / Semaine</div>
                                     <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase"><CheckCircle2 size={12} className="text-emerald-500" /> Rapports Mensuels</div>
                                </div>
                                <button className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-100 dark:border-zinc-800 rounded-xl group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                    Modifier
                                </button>
                            </div>
                        )) : (
                            <div className="p-10 text-center opacity-30 italic bg-gray-50 rounded-3xl border-2 border-dashed">
                                Aucun plan configuré
                            </div>
                        )}
                    </div>
                </div>

                {/* Subscribers Feed */}
                <div className="xl:col-span-2 space-y-6">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-2">
                        <Users className="text-primary" size={20} />
                        Dernières Inscriptions
                    </h2>
                    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-50 dark:border-zinc-800/50">
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Abonné</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Début</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Statut</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                    {subscriptions.length > 0 ? subscriptions.map((sub: any, i) => (
                                        <tr key={i} className="group hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-black text-primary text-xs">
                                                        {sub.profiles?.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none mb-1">{sub.profiles?.full_name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{sub.profiles?.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                                    {sub.subscription_plans?.name || 'Plan Inconnu'}
                                                </span>
                                                <p className="text-[9px] text-gray-400 font-bold tracking-tighter">
                                                    {sub.subscription_plans?.price_cfa?.toLocaleString()} CFA
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">{new Date(sub.created_at).toLocaleDateString()}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                    sub.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                                )}>
                                                    {sub.status === 'active' ? 'Payé' : sub.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button className="text-[10px] font-black text-primary uppercase hover:underline">Détails</button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center opacity-30 italic">Aucun abonnement actif</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Plan Modal */}
            <Modal
                isOpen={isAddPlanModalOpen}
                onClose={() => setIsAddPlanModalOpen(false)}
                title="Créer un Plan d'Abonnement"
            >
                <form onSubmit={handleCreatePlan} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Concession / Zone</label>
                        <select 
                            required
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-sm outline-none appearance-none"
                            value={newPlan.concession_id}
                            onChange={(e) => setNewPlan({ ...newPlan, concession_id: e.target.value })}
                        >
                            {concessions.map(c => (
                                <option key={c.id} value={c.id}>{c.zones?.name} ({c.profiles?.full_name})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom du Plan</label>
                        <input 
                            required
                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-sm outline-none" 
                            placeholder="Ex: Premium Mensuel..." 
                            value={newPlan.name}
                            onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Prix (FCFA)</label>
                            <input 
                                required
                                type="number" 
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-sm outline-none font-black text-primary" 
                                placeholder="5000" 
                                value={newPlan.price_cfa}
                                onChange={(e) => setNewPlan({ ...newPlan, price_cfa: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Fréq. / Sem.</label>
                            <input 
                                required
                                type="number" 
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl text-sm outline-none font-black" 
                                placeholder="1" 
                                value={newPlan.frequency_per_week}
                                onChange={(e) => setNewPlan({ ...newPlan, frequency_per_week: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        className="w-full py-5 bg-gray-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10 mt-4"
                    >
                        Publier le Plan
                    </button>
                </form>
            </Modal>
        </div>
    );
}
