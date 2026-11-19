"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { PasswordForm } from "@/components/account/PasswordForm";

export default function ResetPasswordPage() {
    const supabase = createClient();
    const router = useRouter();
    const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");

    useEffect(() => {
        let active = true;
        const init = async () => {
            // Lien email PKCE : ?code=... à échanger contre une session
            const code = new URLSearchParams(window.location.search).get("code");
            if (code) {
                await supabase.auth.exchangeCodeForSession(code).catch(() => null);
            }
            const { data: { session } } = await supabase.auth.getSession();
            if (active) setState(session ? "ready" : "invalid");
        };
        init();

        // Lien email implicite : événement PASSWORD_RECOVERY
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
            if (event === "PASSWORD_RECOVERY" && active) setState("ready");
        });
        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
            <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl shadow-gray-100 dark:bg-zinc-900 dark:shadow-none border border-gray-100 dark:border-zinc-800">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">Nouveau mot de passe</h1>

                {state === "checking" && (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                )}

                {state === "invalid" && (
                    <div className="space-y-4 text-center">
                        <p className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                            Ce lien est invalide ou a expiré.
                        </p>
                        <Link href="/mdp-oublie" className="inline-block text-sm font-bold text-primary hover:underline">
                            Refaire une demande
                        </Link>
                    </div>
                )}

                {state === "ready" && (
                    <PasswordForm
                        submitLabel="Valider le nouveau mot de passe"
                        onDone={() => setTimeout(() => router.push("/dashboard"), 1500)}
                    />
                )}
            </div>
        </div>
    );
}
