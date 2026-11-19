"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
    const supabase = createClient();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
        });
        setLoading(false);
        // Message identique que l'email existe ou non (pas de fuite d'information)
        if (resetError && !/rate limit/i.test(resetError.message)) {
            setError("Envoi impossible pour le moment. Réessayez dans quelques minutes.");
            return;
        }
        if (resetError) {
            setError("Trop de demandes. Patientez quelques minutes avant de réessayer.");
            return;
        }
        setSent(true);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
            <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl shadow-gray-100 dark:bg-zinc-900 dark:shadow-none border border-gray-100 dark:border-zinc-800">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Mot de passe oublié</h1>
                <p className="mt-2 mb-8 text-sm text-center text-gray-500 dark:text-gray-400">
                    Saisissez votre email : nous vous enverrons un lien pour choisir un nouveau mot de passe.
                </p>

                {sent ? (
                    <div className="p-4 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl">
                        Si un compte existe pour <strong>{email}</strong>, un email de réinitialisation vient d&apos;être envoyé.
                        Pensez à vérifier vos courriers indésirables.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>
                        )}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm outline-none focus:border-primary"
                                    placeholder="vous@exemple.com"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Envoyer le lien
                        </button>
                    </form>
                )}

                <Link href="/connexion" className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-primary">
                    <ArrowLeft className="w-4 h-4" /> Retour à la connexion
                </Link>
            </div>
        </div>
    );
}
