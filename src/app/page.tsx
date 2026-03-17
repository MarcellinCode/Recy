import Link from "next/link";
import { ArrowRight, Recycle, Leaf, Banknote, LayoutDashboard, Building2, Users, Truck, Sparkles, ShieldCheck, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { cn } from "@/lib/utils";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* --- HERO SECTION IMMERSIF --- */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image avec Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero.png"
            alt="CITICLINE Future"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-zinc-950/40"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-4xl space-y-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 border border-primary/20 rounded-full bg-primary/10 backdrop-blur-md text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-black tracking-[0.2em] uppercase">City Waste Management OS</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-[0.85] uppercase italic">
              L'Intelligence <br />
              <span className="text-primary italic">Urbaine</span> <br />
              CITI<span className="text-primary tracking-tighter">CLINE</span>
            </h1>

            <p className="max-w-2xl text-lg md:text-2xl text-gray-300 font-medium leading-relaxed">
              CITICLINE transforme la gestion des déchets en un écosystème rentable pour les citoyens, efficace pour les agents et transparent pour les municipalités.
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

      {/* --- L'ÉCOSYSTÈME CITICLINE (LES 3 PILIERS) --- */}
      <section id="ecosystem" className="py-32 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">L'Écosystème</h2>
            <h3 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">
              Un système <br className="sm:hidden" /> <span className="text-primary">Triple-Win</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PillarCard 
              icon={Users}
              title="Citoyens"
              subtitle="Cash & Salubrité"
              desc="Vendez vos recyclables sur la marketplace ou abonnez-vous pour une collecte régulière sans effort."
              features={["Marketplace rémunérée", "Abonnements confort", "Bouton Urgence Bac Plein"]}
              color="bg-emerald-500"
            />
            <PillarCard 
              icon={Truck}
              title="Organisations"
              subtitle="Gestion de Flotte"
              desc="Optimisez vos tournées d'agents et gérez vos concessions municipales avec une précision chirurgicale."
              features={["Navigation optimisée", "Gestion des abonnés", "Suivi des revenus"]}
              color="bg-blue-600"
            />
            <PillarCard 
              icon={Building2}
              title="Municipalités"
              subtitle="Gouvernance Urbaine"
              desc="Prenez le contrôle de la propreté urbaine et suivez l'impact écologique de votre cité en temps réel."
              features={["Découpage des zones", "Validation concessions", "Analytics CITICLINE"]}
              color="bg-zinc-900"
            />
          </div>
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
              <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden relative shadow-2xl">
                <img src="/images/process.png" alt="Trier" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
                <div className="absolute bottom-8 left-8">
                  <span className="text-6xl font-black text-primary/30 italic">01</span>
                </div>
              </div>
              <div className="px-4">
                <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase mb-2">Triez vos ressources</h4>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest leading-loose">
                  Séparez le plastique, l'aluminium et le papier. Prenez une photo et indiquez le poids estimé via notre application.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group space-y-8 lg:mt-16">
              <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden relative shadow-2xl">
                <img src="/images/hero.png" alt="Publier" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
                <div className="absolute bottom-8 left-8">
                  <span className="text-6xl font-black text-primary/30 italic">02</span>
                </div>
              </div>
              <div className="px-4">
                <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase mb-2">Publiez en un clic</h4>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest leading-loose">
                  Utilisez la géolocalisation pour aider les collecteurs à trouver votre lot. Votre annonce est instantanément visible sur la carte.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group space-y-8 lg:mt-32">
              <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden relative shadow-2xl">
                <img src="/images/collection.png" alt="Gagner" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
                <div className="absolute bottom-8 left-8">
                  <span className="text-6xl font-black text-primary/30 italic">03</span>
                </div>
              </div>
              <div className="px-4">
                <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase mb-2">Encaissez vos gains</h4>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest leading-loose">
                  Une fois la collecte validée par pesée réelle, le paiement est transféré immédiatement sur votre portefeuille.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- IMPACT RÉEL SECTION --- */}
      <section className="relative w-full py-40 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/images/impact.png" alt="Impact" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-primary/20 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-transparent to-zinc-950"></div>
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
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-[4rem] p-16 md:p-24 border border-gray-100 dark:border-zinc-800 shadow-2xl shadow-primary/5">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-8 uppercase tracking-tighter italic">Prêt à <span className="text-primary">Recycler</span> ?</h2>
            <p className="text-lg text-gray-500 font-bold uppercase tracking-widest mb-12 max-w-2xl mx-auto">Rejoignez des milliers de citoyens et d'entreprises qui changent leur manière de gérer les déchets.</p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              {user ? (
                <Link
                  href={profile?.role === 'collecteur' ? "/marketplace" : "/mes-dechets"}
                  className="px-12 py-6 bg-primary text-white font-black rounded-3xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 uppercase tracking-[0.2em] text-sm"
                >
                  Accéder à mon espace
                </Link>
              ) : (
                <>
                  <Link
                    href="/inscription"
                    className="px-12 py-6 bg-primary text-white font-black rounded-3xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 uppercase tracking-[0.2em] text-sm"
                  >
                    Créer mon compte
                  </Link>
                  <Link
                    href="/connexion"
                    className="px-12 py-6 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-zinc-700 font-black rounded-3xl hover:bg-gray-50 transition-all uppercase tracking-[0.2em] text-sm"
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

function PillarCard({ icon: Icon, title, subtitle, desc, features, color }: any) {
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
