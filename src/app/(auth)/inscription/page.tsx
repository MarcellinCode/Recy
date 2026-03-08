"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf, User, Truck, ArrowRight, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [role, setRole] = useState<"vendeur" | "collecteur" | "entreprise" | null>(null);

    useEffect(() => {
        const urlRole = searchParams.get("role");
        if (urlRole === "citoyen" || urlRole === "citizen" || urlRole === "vendeur") setRole("vendeur");
        if (urlRole === "collecteur" || urlRole === "collector") setRole("collecteur");
    }, [searchParams]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
    });

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!role) return;

        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: role,
                    },
                },
            });

            if (authError) throw authError;

            router.push("/connexion?message=Vérifiez votre email pour confirmer l'inscription");
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de l'inscription.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
            <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl shadow-gray-100 dark:bg-zinc-900 dark:shadow-none border border-gray-100 dark:border-zinc-800">
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-primary/10 text-primary">
                        <Leaf className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Créer un compte</h2>
                    <p className="mt-2 text-sm text-center text-gray-500 dark:text-gray-400">
                        Rejoignez l'aventure Recy et commencez à changer le monde.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                        {error}
                    </div>
                )}

                {!role ? (
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Vous êtes ?</p>

                        <button
                            onClick={() => setRole("vendeur")}
                            className="flex items-center w-full p-4 transition-all border-2 rounded-2xl border-gray-100 hover:border-primary hover:bg-primary/5 group text-left dark:border-zinc-800"
                        >
                            <div className="flex items-center justify-center w-12 h-12 mr-4 rounded-xl bg-green-50 text-green-600 dark:bg-green-950/30">
                                <User className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white">Citoyen (Vendeur)</h3>
                                <p className="text-xs text-gray-500">Je souhaite vendre mes déchets recyclables.</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary" />
                        </button>

                        <button
                            onClick={() => setRole("collecteur")}
                            className="flex items-center w-full p-4 transition-all border-2 rounded-2xl border-gray-100 hover:border-amber-500 hover:bg-amber-500/5 group text-left dark:border-zinc-800"
                        >
                            <div className="flex items-center justify-center w-12 h-12 mr-4 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30">
                                <Truck className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white">Collecteur (Acheteur)</h3>
                                <p className="text-xs text-gray-500">Je souhaite acheter et collecter des déchets.</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-amber-500" />
                        </button>

                        <button
                            onClick={() => setRole("entreprise")}
                            className="flex items-center w-full p-4 transition-all border-2 rounded-2xl border-gray-100 hover:border-blue-500 hover:bg-blue-500/5 group text-left dark:border-zinc-800"
                        >
                            <div className="flex items-center justify-center w-12 h-12 mr-4 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white">Partenaire / Entreprise</h3>
                                <p className="text-xs text-gray-500">Achats en gros et accès aux statistiques.</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom complet</label>
                            <input
                                type="text"
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                placeholder="Jean Dupont"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="jean@example.com"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mot de passe</label>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 mt-4 font-bold text-white transition-all rounded-xl shadow-lg bg-primary hover:bg-primary/90 shadow-primary/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            S'inscrire en tant que {role === "vendeur" ? "Citoyen" : role === "collecteur" ? "Collecteur" : "Entreprise"}
                        </button>

                        <button
                            type="button"
                            onClick={() => setRole(null)}
                            className="w-full py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white"
                        >
                            Retour au choix du rôle
                        </button>
                    </form>
                )}

                <div className="mt-8 text-sm text-center text-gray-500">
                    Vous avez déjà un compte ?{" "}
                    <Link href="/connexion" className="font-bold text-primary hover:underline">
                        Connectez-vous
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        }>
            <SignupForm />
        </Suspense>
    );
}
