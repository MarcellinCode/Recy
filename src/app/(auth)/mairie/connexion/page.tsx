"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, Landmark, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";

function MairieLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    useEffect(() => {
        const msg = searchParams.get("message");
        if (msg) setMessage(msg);
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            // Verify if role is really Mairie
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
            if (profile?.role !== 'mairie') {
                await supabase.auth.signOut();
                throw new Error("Cet espace est strictement réservé aux institutions municipales. Accès refusé.");
            }

            router.push("/city-os");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Identifiants invalides.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#07130F] flex flex-col justify-center items-center relative overflow-hidden px-4">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px]" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" />

            <div className="w-full max-w-lg z-10">
                {/* Header Logo */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-primary rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-primary/30 mb-6 border border-white/10 backdrop-blur-md">
                        <Landmark size={36} strokeWidth={1.5} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={20} className="text-emerald-400" />
                        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">Accès Sécurisé</span>
                    </div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter">City<span className="text-primary/80">O.S.</span> Portail</h1>
                    <p className="text-zinc-400 mt-2 text-sm text-center font-medium max-w-sm">Espace d'administration central réservé aux mairies et gouvernements locaux.</p>
                </div>

                {/* Form Card */}
                <div className="bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800/80 p-8 sm:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-2xl font-medium">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-2xl font-medium">
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="officialEmail" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Email Officiel</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    id="officialEmail"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="mairie@ville.gov"
                                    className="w-full pl-14 pr-6 py-5 bg-black/40 border border-zinc-800 focus:border-emerald-500 rounded-3xl text-sm outline-none font-bold text-white transition-all placeholder:text-zinc-600 focus:bg-black/60"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-4 mr-2">
                                <label htmlFor="officialPassword" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Mot de passe</label>
                                <Link href="/mdp-oublie" className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest">
                                    Oublié ?
                                </Link>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    id="officialPassword"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full pl-14 pr-6 py-5 bg-black/40 border border-zinc-800 focus:border-emerald-500 rounded-3xl text-sm outline-none font-bold text-white transition-all placeholder:text-zinc-600 tracking-widest focus:bg-black/60"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-3xl transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Authentification Souveraine
                        </button>
                    </form>
                </div>

                <div className="mt-12 text-center text-xs text-zinc-600 font-medium">
                    <p>&copy; {new Date().getFullYear()} CleanZone City O.S. &mdash; Module Gouvernemental</p>
                </div>
            </div>
        </div>
    );
}

export default function MairieLoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#07130F] flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            </div>
        }>
            <MairieLoginForm />
        </Suspense>
    );
}
