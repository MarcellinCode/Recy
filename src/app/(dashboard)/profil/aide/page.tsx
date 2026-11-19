"use client";

import Link from "next/link";
import { ArrowLeft, HelpCircle, Mail } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";

type Faq = { q: string; a: string };

const COMMON: Faq[] = [
    { q: "Comment recharger mon portefeuille ?", a: "Ouvrez « Mon Portefeuille » puis « Recharger ». En phase pilote, les recharges sont simulées (plafonnées) en attendant l'intégration Mobile Money." },
    { q: "Comment retirer mes gains ?", a: "Dans « Mon Portefeuille », choisissez « Retirer » et indiquez votre numéro Mobile Money. Le montant est bloqué puis versé après validation par l'équipe CleanZone." },
    { q: "J'ai oublié mon mot de passe.", a: "Sur la page de connexion, cliquez sur « Mot de passe oublié » pour recevoir un lien de réinitialisation par email." },
];

const BY_ROLE: Record<string, Faq[]> = {
    producteur: [
        { q: "Comment m'abonner à la collecte ?", a: "Rendez-vous dans « Mon Service » (Abonnements) et choisissez la formule adaptée. Le paiement est débité de votre portefeuille." },
        { q: "Comment signaler un dépôt sauvage ?", a: "Depuis l'application mobile, bouton central « Signaler » : photo + position GPS. Le signalement est transmis à l'organisation responsable de la zone et à la Mairie." },
    ],
    collecteur: [
        { q: "Combien de lots puis-je réserver ?", a: "Le plan gratuit permet 3 réservations par mois. Le plan « Acheteur Premium » les rend illimitées." },
        { q: "Comment finaliser une collecte ?", a: "Dans « Réservations », saisissez le poids final pesé. Le paiement du vendeur est alors débité de votre portefeuille." },
    ],
    organisation_admin: [
        { q: "Comment publier un lot ?", a: "« Mes Lots » puis « Publier ». Seules les organisations agréées peuvent publier sur la marketplace." },
        { q: "Comment ajouter un agent ?", a: "Dans « Mission Control », « Recruter un agent ». Un identifiant et un mot de passe provisoire s'affichent une seule fois : transmettez-les à l'agent." },
        { q: "Comment envoyer un agent sur une mission ?", a: "Dans l'onglet des alertes de vos concessions : prenez en charge le lot puis choisissez l'agent dans « Affecter ». Pour un dépôt sauvage, utilisez « Envoyer un agent »." },
        { q: "Pourquoi mon compte peut-il être suspendu ?", a: "Les sanctions de la Mairie font baisser votre score de performance. Sous 2,5/5, le compte est suspendu automatiquement." },
    ],
    agent_collecteur: [
        { q: "Où sont mes missions ?", a: "Dans « Ma Mission » (web) ou l'onglet Missions de l'application mobile. Validez chaque collecte avec le poids final." },
    ],
    agent_police_verte: [
        { q: "Pourquoi mon PV est-il refusé ?", a: "Un agent ne peut verbaliser que dans sa juridiction (zone attribuée par la Mairie). Contactez votre Mairie si votre zone est incorrecte." },
    ],
    mairie: [
        { q: "Comment attribuer une zone ?", a: "Dans City OS, créez la zone puis attribuez-la directement à une organisation, ou lancez un appel d'offres." },
        { q: "Comment sanctionner une organisation ?", a: "Ouvrez l'infraction dans City OS et choisissez « Sanctionner » : l'amende est débitée et le score de l'organisation baisse." },
        { q: "Comment recruter un agent Police Verte ?", a: "Dans City OS, onglet Police Verte : renseignez l'agent ET sa zone (juridiction), sans quoi il ne pourra dresser aucun PV." },
    ],
};

export default function HelpPage() {
    const { role } = useSession();
    const faqs = [...(role ? BY_ROLE[role] || [] : []), ...COMMON];

    return (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
            <Link href="/profil" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Mon profil
            </Link>

            <header className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-purple-600" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Aide &amp; support</h1>
            </header>

            <section className="space-y-3">
                {faqs.map((f) => (
                    <details key={f.q} className="group p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
                        <summary className="cursor-pointer font-semibold text-sm text-gray-900 dark:text-white list-none flex justify-between gap-4">
                            {f.q}
                            <span className="text-gray-400 group-open:rotate-45 transition-transform">+</span>
                        </summary>
                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.a}</p>
                    </details>
                ))}
            </section>

            <section className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-4">
                <div>
                    <h2 className="font-bold text-gray-900 dark:text-white">Besoin d&apos;aide supplémentaire ?</h2>
                    <p className="text-sm text-gray-500">Notre équipe vous répond sous 48 h ouvrées.</p>
                </div>
                <Link href="/contact" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold shrink-0">
                    <Mail className="w-4 h-4" /> Nous écrire
                </Link>
            </section>
        </div>
    );
}
