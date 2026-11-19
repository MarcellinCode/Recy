"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

/**
 * Formulaire de nouveau mot de passe (réinitialisation et page Sécurité).
 * Nécessite une session active (lien email ou utilisateur connecté).
 */
export function PasswordForm({ onDone, submitLabel = "Enregistrer" }: { onDone?: () => void; submitLabel?: string }) {
    const supabase = createClient();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password.length < 8) {
            setError("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }
        if (password !== confirm) {
            setError("Les deux mots de passe ne correspondent pas.");
            return;
        }
        setLoading(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setLoading(false);
        if (updateError) {
            setError(/session/i.test(updateError.message)
                ? "Lien expiré : refaites une demande de réinitialisation."
                : updateError.message);
            return;
        }
        setSuccess(true);
        setPassword("");
        setConfirm("");
        onDone?.();
    };

    const field = "w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm outline-none focus:border-primary";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>}
            {success && <div className="p-4 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl">Mot de passe mis à jour.</div>}
            <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={field}
                    placeholder="Nouveau mot de passe (8 caractères min.)"
                    aria-label="Nouveau mot de passe"
                />
            </div>
            <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={field}
                    placeholder="Confirmer le mot de passe"
                    aria-label="Confirmer le mot de passe"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60"
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitLabel}
            </button>
        </form>
    );
}
