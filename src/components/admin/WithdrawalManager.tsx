"use client";

import { useState } from "react";
import { Check, X, Clock, Wallet } from "lucide-react";
import { approveWithdrawal, rejectWithdrawal } from "@/app/actions/finance";
import { showToast } from "@/components/ui/toast";
 
interface WithdrawalManagerProps {
    readonly pendingTransactions: readonly any[];
    readonly onRefresh: () => void;
}

export default function WithdrawalManager({ 
    pendingTransactions, 
    onRefresh 
}: Readonly<WithdrawalManagerProps>) {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApprove = async (id: string) => {
        if (!confirm("Voulez-vous vraiment approuver ce retrait ?")) return;
        
        setProcessingId(id);
        const res = await approveWithdrawal(id);
        if (res.success) {
            showToast("Retrait approuvé avec succès", "success");
            onRefresh();
        } else {
            showToast("Erreur : " + res.error, "error");
        }
        setProcessingId(null);
    };

    const handleReject = async (id: string) => {
        const reason = prompt("Raison du refus (obligatoire) :");
        if (!reason) return;

        setProcessingId(id);
        const res = await rejectWithdrawal(id, reason);
        if (res.success) {
            showToast("Retrait refusé. Les fonds ont été recrédités.", "success");
            onRefresh();
        } else {
            showToast("Erreur : " + res.error, "error");
        }
        setProcessingId(null);
    };

    return (
        <div className="bg-white dark:bg-zinc-900 border border-amber-500/20 rounded-[2rem] overflow-hidden shadow-xl shadow-amber-500/5 mb-8">
            <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-500/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-amber-900 dark:text-amber-500 uppercase italic tracking-tighter">
                            Retraits en Attente
                        </h2>
                        <p className="text-[10px] font-bold text-amber-700/60 uppercase tracking-widest">
                            {pendingTransactions.length} demande(s) à traiter
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {pendingTransactions.length === 0 ? (
                    <div className="text-center py-8">
                        <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-[11px] font-black uppercase text-gray-400 tracking-widest">
                            Aucune demande de retrait
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingTransactions.map((tx) => (
                            <div key={tx.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 dark:border-zinc-800 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/20">
                                <div className="mb-4 md:mb-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] font-black uppercase text-gray-400">ID: {tx.id.split('-')[0]}</span>
                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[8px] font-black uppercase tracking-widest">
                                            En attente
                                        </span>
                                    </div>
                                    <h3 className="text-[13px] font-black text-gray-900 dark:text-white uppercase">
                                        {tx.profiles?.full_name || 'Utilisateur inconnu'}
                                    </h3>
                                    <p className="text-[11px] font-bold text-primary italic">
                                        Demande : {Number(tx.amount).toLocaleString()} FCFA
                                    </p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleReject(tx.id)}
                                        disabled={processingId === tx.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        <X size={14} />
                                        Refuser
                                    </button>
                                    <button 
                                        onClick={() => handleApprove(tx.id)}
                                        disabled={processingId === tx.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        {processingId === tx.id ? <Clock className="animate-spin" size={14} /> : <Check size={14} />}
                                        Approuver
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
