"use client";

import { 
    Link as LinkIcon, 
    Copy, 
    Check, 
    Plus, 
    Mail, 
    Building2,
    History,
    MoreVertical,
    Send
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

export default function InvitationsPage() {
    const [copied, setCopied] = useState(false);
    const [generatedLink, setGeneratedLink] = useState("");
    const [mairieName, setMairieName] = useState("");

    const generateLink = () => {
        if (!mairieName) {
            showToast("Veuillez saisir le nom de la mairie", "error");
            return;
        }
        // Simulation d'un token sécurisé
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/inscription?type=official&token=${token}&org=${encodeURIComponent(mairieName)}`;
        setGeneratedLink(link);
        showToast("Lien généré avec succès");
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        showToast("Lien copié dans le presse-papier");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-12 pb-20">
            {/* Header Area */}
            <header>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-1">
                    Invitations <span className="text-primary tracking-tighter">Partenaires</span>
                </h1>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest text-balance">Générez des accès exclusifs pour les institutions municipales</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Generation Card */}
                <section className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <Plus size={24} />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">Nouveau Lien Mairie</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom de la Mairie / Commune</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Mairie de Bingerville"
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:border-primary transition-all"
                                    value={mairieName}
                                    onChange={(e) => setMairieName(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={generateLink}
                                className="w-full py-5 bg-gray-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10"
                            >
                                Générer le lien sécurisé
                            </button>
                        </div>
                    </div>

                    {generatedLink && (
                        <div className="mt-10 p-6 bg-primary/5 border border-primary/20 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">Lien d'inscription généré :</p>
                            <div className="flex items-center gap-3">
                                <input 
                                    readOnly 
                                    value={generatedLink}
                                    className="flex-1 bg-transparent text-[10px] font-medium text-gray-600 truncate border-none outline-none"
                                />
                                <button 
                                    onClick={copyToClipboard}
                                    className="p-3 bg-white dark:bg-zinc-800 rounded-xl text-primary shadow-sm hover:scale-110 transition-transform"
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Info Card */}
                <section className="bg-zinc-900 text-white p-10 rounded-[3rem] shadow-xl relative overflow-hidden group">
                    <div className="relative z-10 space-y-8">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-primary backdrop-blur-md">
                            <Mail size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-tight mb-4 text-balance">
                                Pourquoi un <span className="text-primary tracking-tighter italic">Lien d'Invitation ?</span>
                            </h2>
                            <p className="text-gray-400 text-sm font-medium leading-relaxed italic">
                                Pour garantir la sécurité et l'authenticité des comptes Mairie, l'inscription est restreinte. 
                                Ce lien permet au futur administrateur de la commune d'accéder au formulaire officiel 
                                avec les privilèges déjà configurés.
                            </p>
                        </div>
                        <ul className="space-y-4">
                            {[
                                "Validation automatique du rôle Mairie",
                                "Traçabilité des inscriptions par commune",
                                "Sécurité renforcée contre les faux profils"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                                    <Check size={14} className="text-primary" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </div>

            {/* Recent Invitations */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <History size={20} className="text-gray-400" />
                    <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest italic">Historique des Invitations</h2>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-50 dark:border-zinc-800/50">
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mairie destinataire</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Date</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Etat</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                            {[
                                { name: "Mairie de Cocody", date: "12/03/2024", status: "Inscrit" },
                                { name: "Mairie de Bouaké", date: "11/03/2024", status: "En attente" },
                                { name: "Mairie de San Pedro", date: "10/03/2024", status: "Expiré" },
                            ].map((inv, i) => (
                                <tr key={i} className="group hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-all">
                                    <td className="px-8 py-6 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600">
                                            <Building2 size={20} />
                                        </div>
                                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{inv.name}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right text-xs font-bold text-gray-400">{inv.date}</td>
                                    <td className="px-8 py-6 text-right">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            inv.status === 'Inscrit' ? "bg-emerald-100 text-emerald-600" : (inv.status === 'Expiré' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600")
                                        )}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                                            <Send size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
