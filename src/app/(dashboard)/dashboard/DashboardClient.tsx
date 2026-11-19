"use client";

import Link from "next/link";
import { 
    BarChart3, 
    Leaf, 
    Zap, 
    Award, 
    ShieldCheck, 
    ArrowUpRight,
    ArrowRight,
    Package, 
    Wallet, 
    MapPin, 
    Building2, 
    CircleDollarSign,
    CalendarDays,
    Navigation,
    TrendingUp,
    Truck,
    Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadBadges } from "@/hooks/useUnreadBadges";

interface DashboardClientProps {
    profile: any;
    stats: {
        totalWeight: number;
        co2Saved: number;
        ecoPoints: number;
        collectionsCount: number;
        citizenCount: number;
    };
    activeSub?: any;
}

export default function DashboardClient({ profile, stats, activeSub = null }: DashboardClientProps) {
    const { unreadMessages, unreadReservations } = useUnreadBadges();

    const hubCards = [
        { 
            title: "Réservations", 
            description: "Suivez vos lots réservés", 
            icon: CalendarDays, 
            href: "/reservations", 
            color: "bg-blue-500", 
            badge: unreadReservations
        },
        ...(profile?.role !== 'producteur' ? [{ 
            title: "Carte Live", 
            description: "Explorer les déchets autour", 
            icon: MapPin, 
            href: "/carte", 
            color: "bg-emerald-500" 
        }] : []),
        ...(profile?.role !== 'producteur' ? [{ 
            title: profile?.role === 'organisation_admin' ? "Mes Lots" : "Mes Collectes", 
            description: profile?.role === 'organisation_admin' ? "Gérer vos publications" : "Suivre vos lots collectés", 
            icon: Package, 
            href: "/mes-dechets", 
            color: "bg-amber-500" 
        }] : []),
        { 
            title: "Mon Portefeuille", 
            description: "Consultez vos gains", 
            icon: Wallet, 
            href: "/wallet", 
            color: "bg-purple-500" 
        },
        ...(profile?.role === 'producteur' ? [
            { 
                title: "Mon Service", 
                description: activeSub?.plan?.name || "Gestion abonnement & alertes", 
                icon: ShieldCheck, 
                href: "/abonnements", 
                color: "bg-emerald-600" 
            }
        ] : []),
        ...(profile?.role === 'mairie' ? [
            { 
                title: "Administration", 
                description: "Gestion des zones & concessions", 
                icon: Building2, 
                href: "/city-os", 
                color: "bg-zinc-800" 
            }
        ] : []),
        ...(profile?.role === 'agent_collecteur' ? [
            { 
                title: "Ma Mission", 
                description: "Feuille de route optimisée", 
                icon: Navigation, 
                href: "/missions", 
                color: "bg-primary" 
            }
        ] : []),
        ...(profile?.role === 'organisation_admin' || profile?.role === 'collecteur' ? [
            { 
                title: "Appels d'Offres", 
                description: "Espace B2B & Entreprises", 
                icon: Building2, 
                href: "/appels-offres", 
                color: "bg-indigo-500" 
            },
            ...(profile?.role === 'collecteur' ? [] : [
                { 
                    title: "Mission Control", 
                    description: "Gestion agents & concessions", 
                    icon: TrendingUp, 
                    href: "/organisation", 
                    color: "bg-zinc-900" 
                },
                { 
                    title: "Carnet d'Entretien", 
                    description: "Suivi technique & vidange", 
                    icon: Truck, 
                    href: "/flotte", 
                    color: "bg-primary" 
                }
            ]),
            { 
                title: "Impact RSE", 
                description: "Votre bilan écologique", 
                icon: Leaf, 
                href: "/impact-rse", 
                color: "bg-green-600" 
            }
        ] : []),
    ];

    let welcomeSubText = "Prêt pour votre prochaine action écologique ?";
    if (activeSub?.plan?.name?.toLowerCase().includes('usine')) {
        welcomeSubText = "Tableau de bord industriel CleanZone";
    } else if (activeSub?.plan?.name?.toLowerCase().includes('entreprise')) {
        welcomeSubText = "Espace de gestion entreprise";
    }

    const firstName = profile?.full_name?.split(" ")[0] || "";

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-10 sm:pt-14">

                {/* En-tête */}
                <header className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[40px]">
                            <span className="cz-mask"><span className="cz-line">{firstName ? "Bonjour, " + firstName : "Bonjour"}</span></span>
                        </h1>
                        <p className="cz-in cz-t1 m-0 mt-2 text-base text-muted-foreground">{welcomeSubText}</p>
                    </div>

                    <Link
                        href="/wallet"
                        className="cz-card cz-in cz-t2 flex items-center gap-4 self-start rounded-3xl border border-border bg-white p-4 pr-5 sm:self-auto"
                    >
                        <span className="cz-tile flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E6F5EC]">
                            <CircleDollarSign className="h-5 w-5 text-primary" aria-hidden="true" />
                        </span>
                        <span className="flex flex-col">
                            <span className="text-[13px] text-muted-foreground">Solde du portefeuille</span>
                            <strong className="text-lg tracking-[-0.01em] text-ink">{Number(profile?.wallet_balance || 0).toLocaleString("fr-FR")} FCFA</strong>
                        </span>
                        <ArrowUpRight className="cz-go h-5 w-5 text-primary" aria-hidden="true" />
                    </Link>
                </header>

                {/* Indicateurs */}
                <section aria-label="Vos indicateurs" className="cz-in cz-t2 mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <MiniStat label="Recyclé" value={stats.totalWeight + " kg"} icon={Zap} />
                    <MiniStat label="CO₂ évité" value={stats.co2Saved.toFixed(0) + " kg"} icon={Leaf} />
                    <MiniStat
                        label={profile?.role === "mairie" ? "Citoyens" : "Points éco"}
                        value={profile?.role === "mairie" ? stats.citizenCount : stats.ecoPoints}
                        icon={profile?.role === "mairie" ? Users : Award}
                        highlight={profile?.role !== "mairie"}
                    />
                    <MiniStat label="Collectes" value={stats.collectionsCount} icon={ShieldCheck} />
                </section>

                {/* Accès rapides */}
                <h2 className="cz-in cz-t3 m-0 mb-5 text-xl font-bold tracking-[-0.01em] text-ink">Accès rapides</h2>
                <div className="cz-in cz-t3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {hubCards.map((card) => (
                        <Link
                            key={card.title}
                            href={card.href}
                            className="cz-card flex flex-col gap-3 rounded-3xl border border-border bg-white p-7 text-ink"
                        >
                            <span className="cz-tile relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6F5EC]">
                                <card.icon className="h-[22px] w-[22px] text-primary" aria-hidden="true" />
                                {card.badge ? (
                                    <span className="absolute -right-2 -top-2 flex h-6 min-w-[24px] items-center justify-center rounded-full border-[3px] border-white bg-[#D93025] px-1.5 text-[11px] font-bold text-white">
                                        {card.badge}
                                    </span>
                                ) : null}
                            </span>
                            <strong className="flex items-center gap-2 text-[19px] tracking-[-0.01em]">
                                {card.title}
                                <ArrowUpRight className="cz-go h-4 w-4 text-primary" strokeWidth={2.4} aria-hidden="true" />
                            </strong>
                            <span className="text-[15px] leading-relaxed text-muted-foreground">{card.description}</span>
                        </Link>
                    ))}
                </div>

                {/* Offre pour les collecteurs */}
                {profile?.role === "collecteur" && (
                    <div className="cz-reveal mt-12 flex flex-col items-start justify-between gap-6 rounded-[32px] bg-forest p-8 text-white sm:p-12 lg:flex-row lg:items-center">
                        <div>
                            <h2 className="m-0 mb-2 text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">Passez à Acheteur Premium</h2>
                            <p className="m-0 max-w-xl text-[15px] leading-relaxed text-[#C9DDD1]">
                                Réservations illimitées sur la marketplace, au lieu de 3 par mois avec le plan gratuit.
                            </p>
                        </div>
                        <Link href="/abonnements" className="cz-btn inline-flex h-[52px] shrink-0 items-center gap-2.5 rounded-full bg-leaf px-6 text-[15px] font-bold text-forest hover:bg-[#5BCB50]">
                            Voir l&apos;offre
                            <ArrowRight className="cz-arrow h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

function MiniStat({ label, value, icon: Icon, highlight = false }: Readonly<{
    label: string;
    value: string | number;
    icon: LucideIcon;
    highlight?: boolean;
}>) {
    return (
        <div className={cn(
            "flex items-center gap-3 rounded-3xl p-4 sm:gap-4 sm:p-5",
            highlight ? "bg-[#FBF1D6]" : "border border-border bg-white"
        )}>
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", highlight ? "bg-gold" : "bg-[#E6F5EC]")}>
                <Icon className={cn("h-[18px] w-[18px]", highlight ? "text-ink" : "text-primary")} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
                <span className={cn("text-[13px]", highlight ? "font-semibold text-[#6B4E00]" : "text-muted-foreground")}>{label}</span>
                <strong className="truncate text-lg tracking-[-0.01em] text-ink">{value}</strong>
            </span>
        </div>
    );
}
