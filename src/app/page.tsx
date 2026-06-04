import Link from "next/link";
import { ArrowRight, Recycle, Leaf, Banknote, LayoutDashboard, Building2, Users, Truck, Sparkles, ShieldCheck, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { cn } from "@/lib/utils";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();


  return (
    <div className="flex flex-col min-h-screen">

      {/* --- HERO SECTION IMMERSIF --- */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image avec Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://www.kaweru.com/wp-content/uploads/2025/12/Cotonou.jpg"
            alt="CleanZone - Plateforme d'Intelligence Urbaine et Gestion des Déchets"
            className="w-full h-full object-cover scale-105 brightness-110"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-4xl space-y-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 border border-primary/20 rounded-full bg-primary/10 backdrop-blur-md text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-black tracking-[0.2em] uppercase">City Waste Management OS</span>
            </div>

            <h1 
              aria-label="CleanZone - L'Intelligence Urbaine"
              className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white leading-none sm:leading-[0.85] uppercase italic drop-shadow-2xl"
            >
              L'Intelligence <br />
              <span className="text-primary italic">Urbaine</span> <br />
              CleanZone
            </h1>

            <p className="max-w-2xl text-lg md:text-2xl text-gray-300 font-medium leading-relaxed">
              CleanZone transforme la gestion des déchets en un écosystème rentable pour les citoyens, efficace pour les agents et transparent pour les municipalités.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              {user ? (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center px-10 py-5 text-sm font-black text-white transition-all shadow-2xl rounded-2xl bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-primary/20 uppercase tracking-widest"
                >
                  <LayoutDashboard className="w-5 h-5 mr-3" />
                  Accéder au Central Hub
                  <ArrowRight className="w-5 h-5 ml-3" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/inscription?role=citoyen"
                    className="flex items-center justify-center px-10 py-5 text-sm font-black text-white transition-all shadow-2xl rounded-2xl bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-primary/20 uppercase tracking-widest"
                  >
                    Commencer l'expérience
                    <ArrowRight className="w-5 h-5 ml-3" />
                  </Link>
                  <Link
                    href="#ecosystem"
                    className="flex items-center justify-center px-10 py-5 text-sm font-black transition-all border-2 rounded-2xl border-white/20 text-white backdrop-blur-md hover:bg-white/10 active:scale-95 uppercase tracking-widest"
                  >
                    Découvrir l'écosystème
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- L'ÉCOSYSTÈME CleanZone (LES 3 PILIERS) --- */}
      <section id="ecosystem" className="py-32 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom duration-1000">
            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">L'Écosystème</h2>
            <h3 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">
              Un système <br className="sm:hidden" /> <span className="text-primary italic">Triple-Win</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PillarCard 
              icon={Users}
              title="Citoyens"
              subtitle="Cash & Salubrité"
              desc="Vendez vos recyclables sur la marketplace ou abonnez-vous pour une collecte régulière sans effort."
              features={["Marketplace rémunérée", "Abonnements confort", "Paiements Mobiles Instantanés"]}
              color="bg-emerald-500"
            />
            <PillarCard 
              icon={Truck}
              title="Organisations"
              subtitle="Logistique ERP"
              desc="Optimisez vos tournées d'agents et gérez votre flotte de véhicules avec un suivi technique en temps réel."
              features={["Gestion de Flotte & Maintenance", "Recrutement d'agents", "Suivi des revenus & Wallet"]}
              color="bg-blue-600"
            />
            <PillarCard 
              icon={Building2}
              title="Municipalités"
              subtitle="Gouvernance OS"
              desc="Prenez le contrôle de la propreté urbaine et suivez l'impact écologique de votre cité avec des données certifiées."
              features={["Supervision des zones", "Rapports Impact RSE", "Blockchain & Traçabilité"]}
              color="bg-zinc-900"
            />
          </div>
        </div>
      </section>

      {/* --- BOURSE TEMPS RÉEL (DYNAMIC BANNER) --- */}
      <section className="py-12 bg-zinc-900 overflow-hidden relative">
        <div className="flex animate-marquee whitespace-nowrap gap-12 items-center">
            <BourseTicker name="Plastique HDPE" price="150" trend={+4.2} />
            <BourseTicker name="Aluminium" price="400" trend={+1.5} />
            <BourseTicker name="Papier / Carton" price="55" trend={-2.1} />
            <BourseTicker name="Verre" price="32" trend={+0.8} />
            <BourseTicker name="Métal / Feraille" price="250" trend={+5.6} />
            {/* Repeat for seamless loop */}
            <BourseTicker name="Plastique HDPE" price="150" trend={+4.2} />
            <BourseTicker name="Aluminium" price="400" trend={+1.5} />
            <BourseTicker name="Papier / Carton" price="55" trend={-2.1} />
            <BourseTicker name="Verre" price="32" trend={+0.8} />
            <BourseTicker name="Métal / Feraille" price="250" trend={+5.6} />
        </div>
      </section>

      {/* --- COMMENT ÇA MARCHE SECTION --- */}
      <section className="py-32 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Fonctionnement</h2>
            <h3 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Simple. <span className="text-primary">Rapide.</span> Rentable.</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="group space-y-8">
              <div className="aspect-[4/5] rounded-[3.5rem] overflow-hidden relative shadow-2xl">
                <img src="/images/triage_v2.png" alt="Trier" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
                <div className="absolute bottom-10 left-10">
                  <span className="text-8xl font-black text-primary/40 italic tracking-tighter">01</span>
                </div>
              </div>
              <div className="px-6">
                <h4 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-3">Triez vos ressources</h4>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.15em] leading-loose">
                  Séparez le plastique, l'aluminium et le papier. Prenez une photo et indiquez le poids estimé via notre application intuitive.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group space-y-8 lg:mt-16">
              <div className="aspect-[4/5] rounded-[3.5rem] overflow-hidden relative shadow-2xl">
                <img src="https://www.kaweru.com/wp-content/uploads/2025/12/Cotonou.jpg" alt="Publier" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
                <div className="absolute bottom-10 left-10">
                  <span className="text-8xl font-black text-primary/40 italic tracking-tighter">02</span>
                </div>
              </div>
              <div className="px-6">
                <h4 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-3">Publiez en un clic</h4>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.15em] leading-loose">
                  Utilisez la géolocalisation haute précision pour aider les collecteurs à trouver votre lot. Votre annonce est visible sur la carte interactive.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group space-y-8 lg:mt-32">
              <div className="aspect-[4/5] rounded-[3.5rem] overflow-hidden relative shadow-2xl">
                <img src="/images/payment_v2.png" alt="Gagner" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
                <div className="absolute bottom-10 left-10">
                  <span className="text-8xl font-black text-primary/40 italic tracking-tighter">03</span>
                </div>
              </div>
              <div className="px-6">
                <h4 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-3">Encaissez vos gains</h4>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.15em] leading-loose">
                  Une fois la collecte validée par pesée réelle, le paiement est transféré immédiatement sur votre portefeuille numérique CleanZone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- BUSINESS INTELLIGENCE SECTION --- */}
      <section className="py-32 bg-gray-50 dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="space-y-8">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-full text-primary">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Performance Industrielle</span>
                    </div>
                    <h3 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">
                        Un ERP Logistique <br />
                        <span className="text-primary italic">Sans Précédent</span>
                    </h3>
                    <p className="text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
                        CleanZone fournit aux entreprises de collecte des outils de gestion de pointe. Optimisez chaque litre de carburant et chaque minute de vos agents sur le terrain.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-6 bg-white dark:bg-zinc-800 rounded-3xl border border-gray-100 dark:border-zinc-700 shadow-xl shadow-gray-100/50 dark:shadow-none">
                            <Truck className="w-8 h-8 text-primary mb-4" />
                            <h4 className="font-black text-gray-900 dark:text-white uppercase text-xs mb-2">Gestion Technique</h4>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Suivi automatique du carnet d'entretien & vidanges.</p>
                        </div>
                        <div className="p-6 bg-white dark:bg-zinc-800 rounded-3xl border border-gray-100 dark:border-zinc-700 shadow-xl shadow-gray-100/50 dark:shadow-none">
                            <ShieldCheck className="w-8 h-8 text-emerald-500 mb-4" />
                            <h4 className="font-black text-gray-900 dark:text-white uppercase text-xs mb-2">Transparence RSE</h4>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Rapports d'impact CO2 certifiés pour vos clients.</p>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute -inset-4 bg-primary/10 blur-[100px] rounded-full"></div>
                    <div className="relative aspect-square rounded-[4rem] overflow-hidden bg-zinc-800 border-8 border-white dark:border-zinc-800 shadow-2xl">
                        <img src="/images/impact.png" alt="Dashboard Preview" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- IMPACT RÉEL SECTION --- */}
      <section className="relative w-full py-40 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/images/impact.png" alt="Impact" className="w-full h-full object-cover grayscale brightness-50" />
          <div className="absolute inset-0 bg-primary/20 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/80 to-zinc-950"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center text-white">
          <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.5em] mb-8">Impact Réel</h2>
          <h3 className="text-4xl md:text-6xl font-black mb-20 uppercase tracking-tighter italic max-w-4xl mx-auto">
            Bâtissons ensemble <br />
            la Cité <span className="text-primary italic">Verte</span> de demain
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <div className="space-y-2">
              <p className="text-5xl font-black text-primary tracking-tighter italic">20K+</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Tonnes Collectées</p>
            </div>
            <div className="space-y-2">
              <p className="text-5xl font-black text-primary tracking-tighter italic">15M</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">FCFA Redistribués</p>
            </div>
            <div className="space-y-2">
              <p className="text-5xl font-black text-primary tracking-tighter italic">500+</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Collecteurs Actifs</p>
            </div>
            <div className="space-y-2">
              <p className="text-5xl font-black text-primary tracking-tighter italic">98%</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Taux de Recyclage</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-32 bg-white dark:bg-zinc-950">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-[5rem] p-16 md:p-32 border border-gray-100 dark:border-zinc-800 shadow-2xl shadow-primary/5">
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-8 uppercase tracking-tighter italic">Prêt à <span className="text-primary">Lancer</span> l'Experience ?</h2>
            <p className="text-lg text-gray-400 font-bold uppercase tracking-widest mb-16 max-w-2xl mx-auto leading-relaxed">Rejoignez l'écosystème qui transforme les déchets en ressources précieuses pour l'Afrique.</p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              {user ? (
                <Link
                  href="/dashboard"
                  className="px-14 py-7 bg-primary text-white font-black rounded-3xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 uppercase tracking-[0.2em] text-sm"
                >
                  Accéder à mon espace
                </Link>
              ) : (
                <>
                  <Link
                    href="/inscription"
                    className="px-14 py-7 bg-primary text-white font-black rounded-3xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 uppercase tracking-[0.2em] text-sm"
                  >
                    Créer mon compte
                  </Link>
                  <Link
                    href="/connexion"
                    className="px-14 py-7 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-zinc-700 font-black rounded-3xl hover:bg-gray-50 transition-all uppercase tracking-[0.2em] text-sm"
                  >
                    Se connecter
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

interface PillarCardProps {
  readonly icon: React.ComponentType<any>;
  readonly title: string;
  readonly subtitle: string;
  readonly desc: string;
  readonly features: readonly string[];
  readonly color: string;
}

function PillarCard({ icon: Icon, title, subtitle, desc, features, color }: Readonly<PillarCardProps>) {
  return (
    <div className="group relative p-10 bg-gray-50 dark:bg-zinc-900 rounded-[3rem] border border-gray-100 dark:border-zinc-800 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5">
      <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform", color)}>
        <Icon className="w-8 h-8 text-white" />
      </div>

      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">{subtitle}</h4>
      <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic mb-4">{title}</h3>
      <p className="text-sm text-gray-500 font-bold uppercase tracking-widest leading-loose mb-8">
        {desc}
      </p>

      <ul className="space-y-4">
        {features.map((feature: string) => (
          <li key={feature} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface BourseTickerProps {
  readonly name: string;
  readonly price: string;
  readonly trend: number;
}

function BourseTicker({ name, price, trend }: Readonly<BourseTickerProps>) {
    const isUp = trend > 0;
    return (
        <div className="flex items-center gap-4 px-8 py-3 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{name}</span>
            <span className="text-sm font-black text-white italic tracking-tight">{price} FCFA/kg</span>
            <span className={cn(
                "text-[10px] font-black flex items-center gap-1 uppercase italic",
                isUp ? "text-emerald-500" : "text-red-500"
            )}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                {isUp ? "+" : ""}{trend}%
            </span>
        </div>
    );
}
