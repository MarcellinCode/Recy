import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Home as HomeIcon, Truck, Building2, UserRound, ShieldCheck, Landmark, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase-server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col bg-background text-ink">
      {/* ------------------------------------------------------------ HERO */}
      <section className="bg-forest text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-6 pb-24 pt-20 md:pb-28 md:pt-24">
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-7">
            <h1 className="m-0 text-[40px] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-[52px] lg:text-[62px]">
              <span className="cz-mask"><span className="cz-line">La propreté de</span></span>
              <span className="cz-mask"><span className="cz-line cz-l2">votre ville,</span></span>
              <span className="cz-mask"><span className="cz-line cz-l2 text-leaf [animation-delay:.18s]">enfin organisée.</span></span>
            </h1>
            <p className="cz-in cz-t1 m-0 max-w-[540px] text-lg leading-relaxed text-[#C9DDD1] md:text-[19px]">
              CleanZone relie citoyens, collecteurs, organisations et mairies sur une même plateforme :
              collecte à domicile, marketplace des matières recyclables, signalements et suivi en temps réel.
            </p>
            <div className="cz-in cz-t2 flex flex-wrap gap-3">
              {user ? (
                <Link href="/dashboard" className="cz-btn inline-flex h-14 items-center gap-2.5 rounded-full bg-leaf px-7 text-base font-bold text-forest hover:bg-[#5BCB50]">
                  Accéder à mon espace
                  <ArrowRight className="cz-arrow h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link href="/inscription?role=citoyen" className="cz-btn inline-flex h-14 items-center gap-2.5 rounded-full bg-leaf px-7 text-base font-bold text-forest hover:bg-[#5BCB50]">
                    S&apos;abonner à la collecte
                    <ArrowRight className="cz-arrow h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
                  </Link>
                  <Link href="/inscription" className="cz-btn inline-flex h-14 items-center rounded-full border-[1.5px] border-white/35 px-7 text-base font-semibold text-white hover:border-white/70">
                    Je suis une organisation
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-[1_1_420px] flex-col items-start">
            <div className="cz-wipe relative h-[380px] w-[86%] overflow-hidden rounded-[28px] md:h-[460px]">
              <Image
                src="/images/payment_v2.png"
                alt="Une habitante consulte l'application CleanZone sur son téléphone dans la rue"
                fill
                priority
                sizes="(max-width: 768px) 86vw, 520px"
                className="cz-settle object-cover"
              />
            </div>
            <div className="cz-in cz-t3 -mt-[200px] flex w-[78%] max-w-[360px] flex-col gap-3.5 self-end rounded-[28px] bg-white p-[22px] text-ink shadow-[0_30px_60px_rgba(0,0,0,0.28)] md:-mt-[230px]">
              <span className="text-[13px] font-semibold text-muted-foreground">Votre prochaine collecte</span>
              <div className="flex flex-col gap-2 rounded-[20px] bg-background p-[18px]">
                <span className="text-[13px] font-semibold text-primary">Prochain passage</span>
                <strong className="text-2xl tracking-[-0.02em]">Mardi · 8 h – 10 h</strong>
                <span className="text-sm text-muted-foreground">Selon votre zone de collecte</span>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                  <div className="cz-bar h-full w-[64%] rounded-full bg-brand" />
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="cz-n cz-n1 flex items-center gap-3 rounded-2xl border border-border p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
                    <Truck className="h-[18px] w-[18px] text-white" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col"><strong className="text-sm">Collecte en cours</strong><span className="text-[13px] text-muted-foreground">L&apos;équipe est en route</span></div>
                </div>
                <div className="cz-n cz-n2 flex items-center gap-3 rounded-2xl border border-border p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest">
                    <Check className="h-[18px] w-[18px] text-leaf" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col"><strong className="text-sm">Signalement résolu</strong><span className="text-[13px] text-muted-foreground">Dépôt sauvage nettoyé</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- BANDEAU DES MATIÈRES */}
      <div aria-hidden="true" className="cz-marq-wrap overflow-hidden border-t border-white/5 bg-[#082E20] py-5">
        <div className="cz-marq flex w-max gap-10 whitespace-nowrap text-[17px] font-medium text-[#9CC9AE]">
          {[0, 1].map((k) => (
            <div key={k} className="flex gap-10">
              {MATERIALS.map((m) => (
                <span key={m} className="flex gap-10">{m}<span className="text-[#2F6B4E]">/</span></span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* --------------------------------------------------------- PROFILS */}
      <section id="profils" className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-6 pb-14 pt-24 md:pt-[104px]">
        <div className="cz-reveal flex flex-wrap items-end justify-between gap-4">
          <h2 className="m-0 max-w-[620px] text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] md:text-[42px]">
            Un espace dédié pour chaque acteur de la propreté
          </h2>
          <p className="m-0 max-w-[380px] text-base leading-relaxed text-muted-foreground">
            Chacun voit uniquement ce qui le concerne. Tout le monde est relié en temps réel.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {PROFILES.map((p) => <ProfileCard key={p.title} {...p} />)}
        </div>
      </section>

      {/* -------------------------------------------------- FONCTIONNEMENT */}
      <section id="fonctionnement" className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-6 pb-24 pt-14 md:pb-[104px]">
        <h2 className="cz-reveal m-0 text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] md:text-[42px]">
          Du déchet à la valeur, en trois étapes
        </h2>
        <div className="relative h-0.5 rounded-full bg-border" aria-hidden="true">
          <div className="cz-progress absolute inset-0 rounded-full bg-brand" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className="cz-reveal flex flex-col gap-4">
              <div className="flex h-[200px] items-center justify-center rounded-3xl border border-border bg-white">
                <svg className="cz-draw" width="96" height="96" viewBox="0 0 48 48" fill="none" stroke="#017A35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {s.icon}
                </svg>
              </div>
              <span className="text-sm font-semibold text-primary">Étape {i + 1}</span>
              <strong className="text-[21px] tracking-[-0.01em]">{s.title}</strong>
              <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- MARKETPLACE */}
      <section id="marketplace" className="border-y border-border bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-6 py-24">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px]">
            <div className="cz-reveal-wipe relative h-[300px] overflow-hidden rounded-3xl">
              <Image src="/images/triage_v2.png" alt="Bouteilles plastiques et canettes triées dans des caisses Plastique et Aluminium" fill sizes="(max-width: 768px) 100vw, 560px" className="object-cover" />
            </div>
            <h2 className="cz-reveal m-0 mt-2 text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] md:text-[40px]">
              Les matières recyclables ont un prix
            </h2>
            <p className="cz-reveal m-0 text-base leading-relaxed text-muted-foreground">
              Les lots sont publiés par des organisations agréées, réservés par des collecteurs et payés à la pesée finale.
            </p>
            <Link href="/marketplace" className="cz-btn cz-reveal inline-flex h-12 items-center gap-2.5 self-start rounded-full bg-primary px-[22px] text-[15px] font-semibold text-white hover:bg-[#016B2F]">
              Voir les lots disponibles
              <ArrowRight className="cz-arrow h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid min-w-0 flex-[1_1_480px] grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            {["Plastique PET", "Plastique HDPE", "Aluminium", "Papier / carton"].map((m) => (
              <Link key={m} href="/marketplace" className="cz-card cz-reveal flex flex-col gap-1.5 rounded-[20px] border border-border p-5 text-ink">
                <span className="text-sm text-muted-foreground">{m}</span>
                <strong className="flex items-center gap-2 text-lg">
                  Voir les lots
                  <ArrowRight className="cz-go h-4 w-4 text-primary" strokeWidth={2.4} aria-hidden="true" />
                </strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- IMPACT */}
      <section className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-12 px-6 py-24 md:py-[104px]">
        <div className="cz-reveal-wipe relative h-[320px] min-w-0 flex-[1_1_440px] overflow-hidden rounded-[28px] md:h-[420px]">
          <Image src="/images/impact.png" alt="Vue aérienne d'une ville verte au coucher du soleil" fill sizes="(max-width: 768px) 100vw, 580px" className="object-cover" />
        </div>
        <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-6">
          <h2 className="cz-reveal m-0 text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] md:text-[40px]">
            Un impact mesuré, quartier par quartier
          </h2>
          <p className="cz-reveal m-0 text-base leading-relaxed text-muted-foreground">
            Chaque collecte est pesée et géolocalisée. Les mairies suivent l&apos;évolution de la propreté de leurs zones
            et les organisations disposent de leur bilan écologique, prêt à partager.
          </p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {["Poids collecté par matière et par zone", "Dépôts sauvages signalés et résolus", "Bilan RSE exportable pour les organisations"].map((t) => (
              <li key={t} className="cz-reveal flex items-center gap-3 text-[15px]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6F5EC]">
                  <Check className="h-4 w-4 text-primary" strokeWidth={2.4} aria-hidden="true" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- MAIRIES */}
      <section id="mairies" className="mx-auto w-full max-w-[1200px] px-6 pb-24 md:pb-[104px]">
        <div className="cz-reveal flex flex-wrap items-center justify-between gap-8 rounded-[32px] bg-forest p-8 text-white md:p-14">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3.5">
            <h2 className="m-0 text-[28px] font-extrabold leading-[1.12] tracking-[-0.03em] md:text-[38px]">
              Pilotez la propreté de votre commune depuis City OS
            </h2>
            <p className="m-0 text-base leading-relaxed text-[#C9DDD1]">
              Zones et concessions, appels d&apos;offres, Police Verte, sanctions et éco-taxe : tout au même endroit, avec des données vérifiables.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="cz-btn inline-flex h-[52px] items-center gap-2.5 rounded-full bg-leaf px-6 text-[15px] font-bold text-forest hover:bg-[#5BCB50]">
              Demander une démonstration
              <ArrowRight className="cz-arrow h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <Link href="/mairie/connexion" className="cz-btn inline-flex h-[52px] items-center rounded-full border-[1.5px] border-white/35 px-6 text-[15px] font-semibold text-white hover:border-white/70">
              Espace Mairie
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const MATERIALS = ["Plastique PET", "Plastique HDPE", "Aluminium", "Papier et carton", "Verre", "Ferraille", "Déchets organiques"];

type Profile = { title: string; text: string; href: string; icon: LucideIcon; dark?: boolean };

const PROFILES: Profile[] = [
  { title: "Citoyens", text: "Abonnement de collecte, signalement des dépôts sauvages, points éco.", href: "/inscription?role=citoyen", icon: HomeIcon },
  { title: "Collecteurs", text: "Réservez des lots recyclables près de vous et payez à la pesée.", href: "/inscription?role=collecteur", icon: Truck },
  { title: "Organisations & ONG", text: "Agents, flotte, concessions, appels d'offres et vente de vos lots.", href: "/inscription", icon: Building2 },
  { title: "Agents de collecte", text: "Missions du jour, itinéraire, preuve photo et pesée sur le terrain.", href: "/connexion", icon: UserRound },
  { title: "Police Verte", text: "Constats d'infraction géolocalisés dans votre juridiction, même hors ligne.", href: "/connexion", icon: ShieldCheck },
  { title: "Mairies", text: "City OS : zones, concessions, sanctions, fiscalité et suivi de la propreté.", href: "/mairie/connexion", icon: Landmark, dark: true },
];

function ProfileCard({ title, text, href, icon: Icon, dark }: Readonly<Profile>) {
  return (
    <Link
      href={href}
      className={
        "cz-card cz-reveal flex flex-col gap-3 rounded-3xl border p-7 " +
        (dark ? "border-forest bg-forest text-white" : "border-border bg-white text-ink")
      }
    >
      <span className={"cz-tile flex h-12 w-12 items-center justify-center rounded-2xl " + (dark ? "bg-leaf/20" : "bg-[#E6F5EC]")}>
        <Icon className={"h-[22px] w-[22px] " + (dark ? "text-leaf" : "text-primary")} aria-hidden="true" />
      </span>
      <strong className="flex items-center gap-2 text-[19px]">
        {title}
        <ArrowRight className={"cz-go h-4 w-4 " + (dark ? "text-leaf" : "text-primary")} strokeWidth={2.4} aria-hidden="true" />
      </strong>
      <span className={"text-[15px] leading-relaxed " + (dark ? "text-[#C9DDD1]" : "text-muted-foreground")}>{text}</span>
    </Link>
  );
}

const STEPS = [
  {
    title: "Signaler ou publier",
    text: "Le citoyen signale un dépôt sauvage en photo. L'organisation publie ses lots triés sur la marketplace.",
    icon: (
      <>
        <rect pathLength={1} x="6" y="13" width="36" height="26" rx="5" />
        <path pathLength={1} d="M17 13l3-5h8l3 5" />
        <circle pathLength={1} cx="24" cy="26" r="7" />
      </>
    ),
  },
  {
    title: "Collecter",
    text: "Un agent reçoit la mission sur son téléphone, se rend sur place et confirme la collecte avec la pesée.",
    icon: (
      <>
        <path pathLength={1} d="M4 12h24v20H4zM28 19h8l6 6v7H28" />
        <circle pathLength={1} cx="12" cy="36" r="4" />
        <circle pathLength={1} cx="35" cy="36" r="4" />
      </>
    ),
  },
  {
    title: "Valoriser et payer",
    text: "Le paiement est réparti automatiquement : vendeur, plateforme et éco-taxe de la mairie.",
    icon: (
      <>
        <rect pathLength={1} x="5" y="12" width="38" height="26" rx="5" />
        <path pathLength={1} d="M5 20h38" />
        <path pathLength={1} d="M31 29h6" />
      </>
    ),
  },
];
