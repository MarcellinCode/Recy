import Link from "next/link";
import { Target, Eye, ShieldCheck, ArrowRight } from "lucide-react";

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Header Hero */}
            <section className="relative pt-32 pb-20 overflow-hidden bg-white dark:bg-zinc-950">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-[10px] font-black text-primary uppercase tracking-[0.5em] mb-6">À Propos de Nous</h1>
                    <h2 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic mb-8">
                        L'Intelligence <span className="text-primary">Urbaine</span> <br /> au service de l'Afrique
                    </h2>
                    <p className="max-w-3xl mx-auto text-lg text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
                        CleanZone est née d'une vision simple : transformer le défi des déchets en une opportunité économique et technologique pour les cités africaines de demain.
                    </p>
                </div>
            </section>

            {/* Vision & Mission */}
            <section className="py-24 bg-gray-50 dark:bg-zinc-900">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="p-12 bg-white dark:bg-zinc-800 rounded-[3rem] shadow-xl shadow-gray-200/50 dark:shadow-none space-y-6">
                            <div className="p-3 bg-primary/10 rounded-2xl w-fit">
                                <Eye className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Notre Vision</h3>
                            <p className="text-gray-500 dark:text-zinc-400 leading-relaxed uppercase text-[11px] font-bold tracking-widest leading-loose">
                                Devenir le système d'exploitation de référence pour la propreté urbaine en Afrique. Nous croyons en une ville où chaque habitant est un acteur de la salubrité, récompensé pour son impact positif.
                            </p>
                        </div>
                        <div className="p-12 bg-zinc-950 rounded-[3rem] text-white space-y-6">
                            <div className="p-3 bg-primary/20 rounded-2xl w-fit">
                                <Target className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">Notre Mission</h3>
                            <p className="text-zinc-400 leading-relaxed uppercase text-[11px] font-bold tracking-widest leading-loose">
                                Déployer une infrastructure technologique hybride (Web + Mobile) permettant une traçabilité totale des déchets, de la source jusqu'au point de transformation finale.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Valeurs */}
            <section className="py-24 bg-white dark:bg-zinc-950">
                <div className="max-w-4xl mx-auto px-4 text-center space-y-12">
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter underline decoration-primary decoration-4 underline-offset-8">Nos Valeurs</h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                        <ValueItem 
                            title="Souveraineté" 
                            desc="Donner aux municipalités le contrôle total de leurs données et de leur territoire." 
                        />
                        <ValueItem 
                            title="Transparence" 
                            desc="Chaque transaction et chaque gramme de déchet est tracé et audité en temps réel." 
                        />
                        <ValueItem 
                            title="Impact" 
                            desc="Mesurer chaque action par son bénéfice réel pour l'environnement et l'économie locale." 
                        />
                        <ValueItem 
                            title="Innovation" 
                            desc="Utiliser la technologie de pointe pour résoudre des problèmes séculaires." 
                        />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 bg-primary">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-8">Rejoignez le mouvement</h2>
                    <Link 
                        href="/inscription" 
                        className="inline-flex items-center gap-3 px-12 py-6 bg-white text-primary font-black rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20 uppercase tracking-widest text-sm"
                    >
                        Créer mon compte citoyen
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>
        </div>
    );
}

function ValueItem({ title, desc }: Readonly<{ title: string; desc: string }>) {
    return (
        <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {title}
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-500 font-bold uppercase tracking-widest leading-loose italic">
                {desc}
            </p>
        </div>
    );
}
