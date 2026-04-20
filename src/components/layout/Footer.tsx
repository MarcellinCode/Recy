"use client";

import Link from "next/link";
import { Recycle, Mail, Globe, Twitter, Linkedin, Facebook, ArrowUpRight } from "lucide-react";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative bg-zinc-950 border-t border-white/5 pt-20 pb-10 overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 blur-[150px] rounded-full -translate-y-1/2"></div>
            
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-20">
                    
                    {/* Brand Section */}
                    <div className="space-y-6">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="p-2 bg-primary/20 rounded-xl border border-primary/20 group-hover:scale-110 transition-transform">
                                <Recycle className="w-6 h-6 text-primary" />
                            </div>
                            <span className="text-xl font-black text-white tracking-widest uppercase italic">CITI<span className="text-primary">CLINE</span></span>
                        </Link>
                        <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                            L'Intelligence Urbaine au service de l'économie circulaire. Transformez chaque déchet en ressource précieuse pour votre cité.
                        </p>
                        <div className="flex items-center gap-4">
                            <SocialLink icon={Twitter} href="#" />
                            <SocialLink icon={Linkedin} href="#" />
                            <SocialLink icon={Facebook} href="#" />
                        </div>
                    </div>

                    {/* Platform Links */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.3em]">Plateforme</h4>
                        <ul className="space-y-4">
                            <FooterLink href="/marketplace">Marketplace</FooterLink>
                            <FooterLink href="/inscription">Rejoindre l'écosystème</FooterLink>
                            <FooterLink href="/city-os">City OS (Mairies)</FooterLink>
                            <FooterLink href="/bourse">Bourse des matières</FooterLink>
                        </ul>
                    </div>

                    {/* Company / Support */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.3em]">Entreprise</h4>
                        <ul className="space-y-4">
                            <FooterLink href="/a-propos">À propos</FooterLink>
                            <FooterLink href="/contact">Nous contacter</FooterLink>
                            <FooterLink href="/impact-rse">Impact & RSE</FooterLink>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.3em]">Légal</h4>
                        <ul className="space-y-4">
                            <FooterLink href="/conditions">Conditions Générales</FooterLink>
                            <FooterLink href="/confidentialite">Confidentialité</FooterLink>
                            <FooterLink href="/mentions-legales">Mentions Légales</FooterLink>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                        © {currentYear} CITICLINE. Tous droits réservés.
                    </p>
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 text-zinc-500">
                             <Globe className="w-3 h-3" />
                             <span className="text-[10px] uppercase font-bold tracking-widest">Afrique / Worldwide</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                             <Mail className="w-3 h-3" />
                             <span className="text-[10px] uppercase font-bold tracking-widest">contact@citicline.com</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function SocialLink({ icon: Icon, href }: { icon: any; href: string }) {
    return (
        <a 
            href={href} 
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
        >
            <Icon className="w-4 h-4" />
        </a>
    );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <li>
            <Link 
                href={href} 
                className="text-zinc-400 text-xs font-bold uppercase tracking-widest hover:text-white flex items-center group transition-colors"
            >
                {children}
                <ArrowUpRight className="w-3 h-3 ml-2 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
            </Link>
        </li>
    );
}
