import { AlertCircle } from "lucide-react";

export default function MentionsLegalesPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950">
            {/* Header */}
            <section className="pt-32 pb-16 border-b border-gray-100 dark:border-zinc-800">
                <div className="max-w-4xl mx-auto px-4">
                    <h1 className="text-[10px] font-black text-primary uppercase tracking-[0.5em] mb-4">Légal</h1>
                    <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                        Mentions <br /> <span className="text-primary italic">Légales</span>
                    </h2>
                    <p className="mt-6 text-sm text-gray-400 font-bold uppercase tracking-widest">Dernière mise à jour : 28 Mai 2026</p>
                </div>
            </section>

            {/* Content */}
            <section className="py-20">
                <div className="max-w-4xl mx-auto px-4 prose prose-zinc dark:prose-invert prose-headings:uppercase prose-headings:italic prose-headings:font-black prose-headings:tracking-tighter">
                    <div className="space-y-16">
                        
                        <Section 
                            title="1. Éditeur de la Plateforme"
                            content="La plateforme AfriCleaner (anciennement CITICLINE) est éditée par la société AfriCleaner SAS, société par actions simplifiée au capital de 5 000 000 FCFA, immatriculée au Registre du Commerce et du Crédit Mobilier (RCCM) de Côte d'Ivoire. Siège social : Cocody, Abidjan, Côte d'Ivoire."
                        />

                        <Section 
                            title="2. Hébergement"
                            content="La plateforme web et les bases de données sont hébergées de manière sécurisée par les services de Vercel Inc. (siège social à San Francisco, USA) et Supabase Inc. (siège social à San Francisco, USA), assurant un chiffrement des données de bout en bout."
                        />

                        <Section 
                            title="3. Propriété Intellectuelle"
                            content="Tous les éléments constitutifs de cette plateforme (logos, codes sources, charte graphique, algorithmes de routage, City OS) sont la propriété exclusive d'AfriCleaner SAS. Toute reproduction totale ou partielle sans autorisation écrite est strictement interdite."
                        />

                        <Section 
                            title="4. Protection des Données Personnelles"
                            content="AfriCleaner est profondément engagé dans le respect de la souveraineté numérique et de la vie privée. Vos coordonnées géographiques (GPS) et informations de Mobile Money sont cryptées et utilisées uniquement pour l'attribution des missions de collecte et les transactions financières sécurisées via PawaPay. Aucune donnée n'est revendue à des tiers."
                        />

                        <Section 
                            title="5. Contact"
                            content="Pour toute question, réclamation ou signalement concernant le fonctionnement technique de la plateforme, vous pouvez nous écrire directement à : contact@africleaner.com."
                        />

                        <div className="p-8 bg-primary/5 border border-primary/20 rounded-3xl space-y-4">
                            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                                <AlertCircle className="w-4 h-4" />
                                Transparence et Souveraineté
                            </div>
                            <p className="text-sm text-gray-600 dark:text-zinc-400 font-medium leading-loose">
                                Nos services sont conçus localement pour répondre aux défis spécifiques de l'assainissement en Afrique. Nous collaborons étroitement avec les administrations locales et la Police Verte pour vous garantir un environnement plus propre et sécurisé.
                            </p>
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
}

function Section({ title, content }: Readonly<{ title: string; content: string }>) {
    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white border-l-4 border-primary pl-4">{title}</h3>
            <p className="text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">
                {content}
            </p>
        </div>
    );
}
