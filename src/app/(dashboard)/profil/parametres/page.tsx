"use client";

import Link from "next/link";
import { ArrowLeft, Settings, User, ShieldCheck, Bell, Trash2, ChevronRight } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";

const ROLE_LABELS: Record<string, string> = {
    producteur: "Citoyen / Producteur",
    collecteur: "Collecteur indépendant",
    organisation_admin: "Organisation / ONG",
    agent_collecteur: "Agent de collecte",
    agent_police_verte: "Agent Police Verte",
    mairie: "Mairie",
    super_admin: "Super administrateur",
};

export default function SettingsPage() {
    const { email, role, profile } = useSession();

    const items = [
        { href: "/profil/informations", icon: User, label: "Informations personnelles", hint: "Nom, téléphone, ville, photo" },
        { href: "/profil/securite", icon: ShieldCheck, label: "Sécurité & mot de passe", hint: "Mot de passe, sessions" },
        { href: "/notifications", icon: Bell, label: "Notifications", hint: "Historique de vos alertes" },
    ];

    return (
        <div className="max-w-xl mx-auto px-4 py-10 space-y-8">
            <Link href="/profil" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Mon profil
            </Link>

            <header className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-gray-600" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Paramètres</h1>
            </header>

            <section className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt className="text-gray-400 text-xs uppercase tracking-widest font-bold">Nom</dt>
                        <dd className="font-semibold text-gray-900 dark:text-white">{profile?.full_name || "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-400 text-xs uppercase tracking-widest font-bold">Email</dt>
                        <dd className="font-semibold text-gray-900 dark:text-white break-all">{email || "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-400 text-xs uppercase tracking-widest font-bold">Profil</dt>
                        <dd className="font-semibold text-gray-900 dark:text-white">{(role && ROLE_LABELS[role]) || role || "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-400 text-xs uppercase tracking-widest font-bold">Statut</dt>
                        <dd className="font-semibold text-gray-900 dark:text-white">{profile?.status || "Actif"}</dd>
                    </div>
                </dl>
            </section>

            <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-50 dark:divide-zinc-800">
                {items.map(({ href, icon: Icon, label, hint }) => (
                    <Link key={href} href={href} className="flex items-center gap-4 p-5 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <Icon className="w-5 h-5 text-gray-500" />
                        <div className="flex-1">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white">{label}</p>
                            <p className="text-xs text-gray-400">{hint}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                    </Link>
                ))}
            </section>

            <section className="p-6 rounded-3xl border border-red-100 bg-red-50/40 space-y-2">
                <h2 className="font-bold text-red-700 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Suppression du compte</h2>
                <p className="text-sm text-red-700/80">
                    La suppression efface votre profil et l&apos;historique associé. Elle est traitée par l&apos;équipe CleanZone
                    (vérification du solde du portefeuille avant clôture).
                </p>
                <Link href="/contact" className="inline-block text-sm font-bold text-red-700 underline">
                    Demander la suppression de mon compte
                </Link>
            </section>
        </div>
    );
}
