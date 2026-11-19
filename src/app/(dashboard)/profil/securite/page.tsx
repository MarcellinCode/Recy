"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { PasswordForm } from "@/components/account/PasswordForm";
import { useSession } from "@/components/providers/SessionProvider";

export default function SecurityPage() {
    const supabase = createClient();
    const router = useRouter();
    const { email } = useSession();
    const [signingOut, setSigningOut] = useState(false);

    const signOutEverywhere = async () => {
        setSigningOut(true);
        await supabase.auth.signOut({ scope: "global" }).catch(() => null);
        router.push("/connexion?message=" + encodeURIComponent("Vous avez été déconnecté de tous vos appareils."));
        router.refresh();
    };

    return (
        <div className="max-w-xl mx-auto px-4 py-10 space-y-8">
            <Link href="/profil" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Mon profil
            </Link>

            <header className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Sécurité &amp; mot de passe</h1>
                    {email && <p className="text-sm text-gray-500">Compte : {email}</p>}
                </div>
            </header>

            <section className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 space-y-4">
                <h2 className="font-bold text-gray-900 dark:text-white">Changer de mot de passe</h2>
                <PasswordForm submitLabel="Mettre à jour le mot de passe" />
            </section>

            <section className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 space-y-3">
                <h2 className="font-bold text-gray-900 dark:text-white">Sessions</h2>
                <p className="text-sm text-gray-500">
                    Un doute sur un appareil (téléphone perdu, ordinateur partagé) ? Déconnectez toutes les sessions ouvertes.
                </p>
                <button
                    onClick={signOutEverywhere}
                    disabled={signingOut}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-60"
                >
                    {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Se déconnecter de tous les appareils
                </button>
            </section>
        </div>
    );
}
