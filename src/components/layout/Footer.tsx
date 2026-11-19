"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-border bg-white">
            <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-10 px-6 pb-10 pt-14">
                <div className="flex max-w-[320px] flex-col gap-3">
                    <Link href="/" className="flex items-center gap-2.5 text-ink">
                        <img src="/logo-mark.png" alt="" className="h-8 w-8" />
                        <strong className="text-lg tracking-[-0.02em]">CleanZone</strong>
                    </Link>
                    <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                        La plateforme de gestion intelligente des déchets en Côte d&apos;Ivoire.
                    </p>
                    <a href="mailto:contact@cleanzone.com" className="cz-link flex items-center gap-2 self-start text-sm text-muted-foreground hover:text-ink">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        contact@cleanzone.com
                    </a>
                </div>

                <div className="flex flex-wrap gap-12 text-sm">
                    <FooterColumn title="Plateforme" links={[
                        ["/marketplace", "Marketplace"],
                        ["/abonnements", "Abonnements"],
                        ["/bourse", "Bourse des matières"],
                        ["/inscription", "Créer un compte"],
                    ]} />
                    <FooterColumn title="Société" links={[
                        ["/a-propos", "À propos"],
                        ["/contact", "Contact"],
                        ["/mairie/connexion", "Espace Mairie"],
                    ]} />
                    <FooterColumn title="Légal" links={[
                        ["/conditions", "Conditions générales"],
                        ["/confidentialite", "Confidentialité"],
                        ["/mentions-legales", "Mentions légales"],
                    ]} />
                </div>
            </div>

            <div className="border-t border-border">
                <p className="mx-auto m-0 max-w-[1200px] px-6 py-6 text-[13px] text-muted-foreground">
                    © {currentYear} CleanZone. Tous droits réservés.
                </p>
            </div>
        </footer>
    );
}

function FooterColumn({ title, links }: Readonly<{ title: string; links: [string, string][] }>) {
    return (
        <div className="flex flex-col gap-2.5">
            <strong className="text-ink">{title}</strong>
            {links.map(([href, label]) => (
                <Link key={href} href={href} className="cz-link self-start text-muted-foreground hover:text-ink">
                    {label}
                </Link>
            ))}
        </div>
    );
}
