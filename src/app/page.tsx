import Link from "next/link";
import { ArrowRight, Recycle, Leaf, Banknote, LayoutDashboard, Building2, Users, Truck, Sparkles, ShieldCheck, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase-server";

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
            alt="Recycling Future"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 border border-primary/20 rounded-full bg-primary/10 backdrop-blur-md text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-black tracking-[0.2em] uppercase">L'économie circulaire 2.0</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.9] uppercase italic">
              Donnez une <br />
              <span className="text-primary italic">Seconde Vie</span> <br />
              à vos ressources
            </h1>

            <p className="max-w-xl text-lg md:text-xl text-gray-300 font-medium leading-relaxed">
              WaveClean est la plateforme intelligente qui transforme vos déchets en revenus. Triez, publiez, et participez à la révolution écologique de votre ville.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              {user ? (
                <Link
                  href={profile?.role === 'collecteur' ? "/marketplace" : "/mes-dechets"}
                  className="flex items-center justify-center px-10 py-5 text-sm font-black text-white transition-all shadow-2xl rounded-2xl bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-primary/20 uppercase tracking-widest"
                >
                  <LayoutDashboard className="w-5 h-5 mr-3" />
                  Tableau de bord
                  <ArrowRight className="w-5 h-5 ml-3" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/inscription?role=citoyen"
                    className="flex items-center justify-center px-10 py-5 text-sm font-black text-white transition-all shadow-2xl rounded-2xl bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-primary/20 uppercase tracking-widest"
                  >
                    Vendre mes déchets
                    <ArrowRight className="w-5 h-5 ml-3" />
                  </Link>
                  <Link
                    href="/inscription?role=collecteur"
                    className="flex items-center justify-center px-10 py-5 text-sm font-black transition-all border-2 rounded-2xl border-white/20 text-white backdrop-blur-md hover:bg-white/10 active:scale-95 uppercase tracking-widest"
                  >
                    Devenir Collecteur
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- NOTRE VISION (VOTRE RÉSUMÉ) --- */}
      <section id="vision" className="w-full max-w-7xl mx-auto px-4 -mt-20 relative z-20">
        <div className="bg-zinc-900 rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl border border-white/5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full -mr-48 -mt-48"></div>

          <div className="relative z-10 text-center mb-16">
            <h2 className="text-xs font-black text-primary uppercase tracking-[0.4em] mb-4">Notre Vision</h2>
            <p className="text-2xl md:text-3xl font-black italic tracking-tighter leading-tight max-w-4xl mx-auto uppercase">
              "WaveClean est une <span className="text-primary">marketplace numérique</span> de déchets recyclables qui révolutionne l'économie circulaire."
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
            <div className="space-y-4 text-center md:text-left">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary mx-auto md:mx-0">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-black text-xs uppercase tracking-widest text-primary">Citoyens</h4>
              <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase tracking-widest">
                Gagnez de l'argent et des points éco en valorisant vos déchets domestiques.
              </p>
            </div>

            <div className="space-y-4 text-center md:text-left">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary mx-auto md:mx-0">
                <Truck className="w-6 h-6" />
              </div>
              <h4 className="font-black text-xs uppercase tracking-widest text-primary">Collecteurs</h4>
              <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase tracking-widest">
                Optimisez vos tournées grâce à notre cartographie intelligente en temps réel.
              </p>
            </div>

            <div className="space-y-4 text-center md:text-left">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary mx-auto md:mx-0">
                <Building2 className="w-6 h-6" />
              </div>
              <h4 className="font-black text-xs uppercase tracking-widest text-primary">Entreprises</h4>
              <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase tracking-widest">
                Sécurisez vos approvisionnements en matières premières recyclées certifiées.
              </p>
            </div>
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
