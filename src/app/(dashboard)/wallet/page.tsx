"use client";

import { useState, useEffect } from "react";
import { 
    Wallet, 
    TrendingUp, 
    ArrowUpRight, 
    ArrowDownLeft, 
    CreditCard, 
    History, 
    Plus, 
    ArrowRight,
    Loader2,
    Leaf,
    ShieldCheck,
    X,
    CheckCircle2,
    Phone
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { navigateSafe } from "@/utils/navigation";
import { walletService } from "@/services/walletService";
import { userService } from "@/services/userService";
import { cn } from "@/lib/utils";

export default function WalletPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [totalWeight, setTotalWeight] = useState(0);

    // Modals
    const [showDeposit, setShowDeposit] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const currentProfile = await userService.getCurrentProfile();
            if (!currentProfile) {
                navigateSafe(router, ROUTES.CONNEXION);
                return;
            }

            const data = await walletService.getWalletData(currentProfile.id);
            setProfile(data.profile);
            setTransactions(data.transactions);
            setTotalWeight(data.totalWeight);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [router]);

    const handleDeposit = async () => {
        const num = Number(amount);
        if (!num || num <= 0) { setError('Montant invalide'); return; }
        
        setProcessing(true);
        setError(null);
        const res = await walletService.creditWallet(profile.id, num);
        setProcessing(false);

        if (res.success) {
            setSuccess(`+${num.toLocaleString()} CFA reçus (Simulation)`);
            setAmount('');
            setTimeout(() => { setShowDeposit(false); setSuccess(null); fetchData(); }, 2000);
        } else {
            setError(res.error || 'Erreur inconnue');
        }
    };

    const handleWithdraw = async () => {
        const num = Number(amount);
        if (!num || num <= 0) { setError('Montant invalide'); return; }
        if (!phone || phone.length < 8) { setError('Numéro de téléphone invalide'); return; }
        if (num > (profile?.wallet_balance || 0)) { setError('Solde insuffisant'); return; }
        
        setProcessing(true);
        setError(null);
        
        // Débiter d'abord
        const debitRes = await walletService.debitWallet(profile.id, num);
        if (!debitRes.success) {
            setProcessing(false);
            setError(debitRes.error || 'Erreur lors du débit');
            return;
        }
        
        // Puis simuler le retrait
        const res = await walletService.withdraw(profile.id, num, phone);
        setProcessing(false);

        if (res.success) {
            setSuccess(`${num.toLocaleString()} CFA envoyés vers ${phone} (Simulation)`);
            setAmount('');
            setPhone('');
            setTimeout(() => { setShowWithdraw(false); setSuccess(null); fetchData(); }, 2500);
        } else {
            setError(res.error || 'Erreur inconnue');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Ouverture du coffre-fort...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 mb-20 md:mb-0">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-[2px] bg-amber-500"></span>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 italic">Mode Simulation</p>
                    </div>
                    <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic flex items-center gap-3">
                        <Wallet className="w-10 h-10 text-primary" />
                        Mon <span className="text-primary">Wallet</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-3 font-medium">
                        Gérez vos gains issus du recyclage et suivez votre impact.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => { setShowDeposit(true); setError(null); setSuccess(null); }}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                    >
                        <Plus className="w-4 h-4" />
                        Déposer
                    </button>
                    <button 
                        onClick={() => { setShowWithdraw(true); setError(null); setSuccess(null); }}
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 text-gray-900 dark:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:border-primary transition-all shadow-sm"
                    >
                        <CreditCard className="w-4 h-4 text-primary" />
                        Retirer
                    </button>
                </div>
            </div>

            {/* Main Balance Card */}
            <div className="relative group overflow-hidden">
                <div className="absolute inset-0 bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
                <div className="relative bg-zinc-900 dark:bg-black p-10 md:p-14 rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <TrendingUp className="w-64 h-64 text-primary" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row gap-12 items-start md:items-center justify-between">
                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3" />
                                Solde Sécurisé
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-7xl md:text-8xl font-black text-white tracking-tighter italic">
                                    {profile?.wallet_balance?.toLocaleString('fr-FR') || '0'}
                                </span>
                                <span className="text-2xl font-black text-primary uppercase italic">CFA</span>
                            </div>
                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="text-[10px] text-white font-bold uppercase tracking-widest">Simulation Active</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Total Recyclé</p>
                                <p className="text-3xl font-black text-white italic">{totalWeight} <span className="text-xs">KG</span></p>
                            </div>
                            <div className="p-6 bg-primary/20 rounded-3xl border border-primary/20 backdrop-blur-md">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Eco-Points</p>
                                <p className="text-3xl font-black text-white italic">{profile?.eco_points || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-2">
                            <History className="w-6 h-6 text-primary" />
                            Activités Récentes
                        </h2>
                        <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                            Voir tout <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {transactions.length > 0 ? (
                            transactions.map((tx) => (
                                <div key={tx.id} className="group bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-zinc-800 hover:border-primary/30 transition-all flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                                            tx.type === 'income' ? "bg-green-100 dark:bg-green-500/10 text-green-600" : 
                                            tx.type === 'outcome' ? "bg-red-100 dark:bg-red-500/10 text-red-600" :
                                            "bg-blue-100 dark:bg-blue-500/10 text-blue-600"
                                        )}>
                                            {tx.type === 'income' ? <ArrowDownLeft className="w-7 h-7" /> : 
                                             tx.type === 'outcome' ? <ArrowUpRight className="w-7 h-7" /> :
                                             <Wallet className="w-7 h-7" />}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-widest">{tx.description}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                                                {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "text-lg font-black italic",
                                            tx.type === 'income' ? "text-green-600" : 
                                            tx.type === 'outcome' ? "text-red-600" : 
                                            "text-gray-900 dark:text-white"
                                        )}>
                                            {tx.type === 'income' ? '+' : '-'}{Math.abs(tx.amount).toLocaleString('fr-FR')} <span className="text-[10px]">CFA</span>
                                        </p>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Simulation</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 italic bg-gray-50/50 dark:bg-zinc-900/50 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-zinc-800">
                                <History className="w-12 h-12 mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest">Aucune transaction pour le moment</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-2">
                        <Leaf className="w-6 h-6 text-primary" />
                        Impact
                    </h2>
                    <div className="bg-primary p-8 rounded-[3rem] text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
                            <Leaf className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-80">CO2 Évité</p>
                            <p className="text-6xl font-black tracking-tighter italic mb-4">
                                {Math.round(totalWeight * 2.5)} <span className="text-lg">KG</span>
                            </p>
                            <p className="text-xs font-medium leading-relaxed opacity-90 italic">
                                Vos efforts de recyclage ont permis d'éviter l'équivalent de {(totalWeight * 10).toFixed(0)} km en voiture.
                            </p>
                            <div className="mt-8 pt-8 border-t border-white/20">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Rang : Éco-Warrior</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">85%</span>
                                </div>
                                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white rounded-full w-[85%]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6">
                        <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Conseils Gain</h4>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                    <Plus className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 leading-normal">
                                    Le tri sélectif augmente la valeur de vos lots de <span className="text-primary">15%</span>.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 leading-normal">
                                    Les métaux sont actuellement en hausse de <span className="text-primary">8%</span> sur le marché.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== MODAL DÉPÔT (Simulation) ========== */}
            {showDeposit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl relative">
                        <button onClick={() => setShowDeposit(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-all">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                        
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-5 h-[2px] bg-amber-500"></span>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 italic">Simulation</p>
                        </div>
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter dark:text-white mb-8">Recharger</h3>

                        {success ? (
                            <div className="flex flex-col items-center gap-4 py-8">
                                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                                <p className="text-sm font-bold text-emerald-600 text-center">{success}</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Montant (CFA)</label>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="Ex: 5000"
                                            className="w-full h-16 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl px-6 text-2xl font-black text-gray-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-all"
                                        />
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        {[1000, 2000, 5000, 10000].map(v => (
                                            <button 
                                                key={v} 
                                                onClick={() => setAmount(String(v))}
                                                className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 rounded-xl text-xs font-black text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-all"
                                            >
                                                {v.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>

                                    {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}
                                </div>

                                <button 
                                    onClick={handleDeposit}
                                    disabled={processing}
                                    className="w-full mt-8 py-5 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement...</> : <>Confirmer le Dépôt <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ========== MODAL RETRAIT (Simulation) ========== */}
            {showWithdraw && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl relative">
                        <button onClick={() => setShowWithdraw(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-all">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                        
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-5 h-[2px] bg-amber-500"></span>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 italic">Simulation</p>
                        </div>
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter dark:text-white mb-8">Retirer</h3>

                        {success ? (
                            <div className="flex flex-col items-center gap-4 py-8">
                                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                                <p className="text-sm font-bold text-emerald-600 text-center">{success}</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Montant (CFA)</label>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="Ex: 3000"
                                            className="w-full h-16 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl px-6 text-2xl font-black text-gray-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-all"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Numéro Mobile Money</label>
                                        <div className="relative">
                                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+225 07 XX XX XX XX"
                                                className="w-full h-16 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl pl-14 pr-6 text-lg font-bold text-gray-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Solde disponible</p>
                                        <p className="text-xl font-black text-gray-900 dark:text-white italic">{(profile?.wallet_balance || 0).toLocaleString()} CFA</p>
                                    </div>

                                    {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}
                                </div>

                                <button 
                                    onClick={handleWithdraw}
                                    disabled={processing}
                                    className="w-full mt-8 py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement...</> : <>Retirer vers Mobile Money <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
