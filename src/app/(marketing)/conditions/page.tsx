import { Scale, AlertCircle } from "lucide-react";

export default function ConditionsPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950">
            {/* Header */}
            <section className="pt-32 pb-16 border-b border-gray-100 dark:border-zinc-800">
                <div className="max-w-4xl mx-auto px-4">
                    <h1 className="text-[10px] font-black text-primary uppercase tracking-[0.5em] mb-4">Légal</h1>
                    <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                        Conditions Générales <br /> <span className="text-primary italic">d'Utilisation</span>
                    </h2>
                    <p className="mt-6 text-sm text-gray-400 font-bold uppercase tracking-widest">Dernière mise à jour : 20 Avril 2026</p>
                </div>
            </section>

            {/* Content */}
            <section className="py-20">
                <div className="max-w-4xl mx-auto px-4 prose prose-zinc dark:prose-invert prose-headings:uppercase prose-headings:italic prose-headings:font-black prose-headings:tracking-tighter">
                    <div className="space-y-16">
                        
                        <Section 
                            title="1. Objet de la plateforme"
                            content="CITICLINE est une plateforme technologique facilitant la gestion des déchets recyclables. Elle connecte les citoyens, les mairies et les entreprises de collecte. L'utilisation du site implique l'acceptation intégrale des présentes conditions."
                        />

                        <Section 
                            title="2. Comptes et Inscription"
                            content="L'accès à certaines fonctionnalités (Marketplace, Wallet) nécessite la création d'un compte. Vous êtes responsable de la confidentialité de vos identifiants. CITICLINE se réserve le droit de suspendre tout compte ne respectant pas les règles de salubrité urbaine."
                        />

                        <Section 
                            title="3. Marketplace et Transactions"
                            content="Les prix des déchets sont fixés par le marché ou par accord mutuel entre l'acheteur et le vendeur. CITICLINE agit en tant qu'intermédiaire technique et n'est pas responsable de la qualité réelle des déchets échangés."
                        />

                        <Section 
                            title="4. Système de Wallet"
                            content="Le Wallet CITICLINE permet de stocker des crédits virtuels issus de la valorisation de vos déchets. Ces crédits sont convertibles selon les modalités en vigueur. Toute tentative de fraude sur le poids ou la nature des déchets entraînera le blocage définitif du Wallet."
                        />

                        <Section 
                            title="5. Responsabilité"
                            content="CITICLINE ne peut être tenue responsable des dommages indirects liés à l'utilisation de la plateforme. La manipulation des déchets reste sous la responsabilité exclusive de l'utilisateur."
                        />

                        <div className="p-8 bg-primary/5 border border-primary/20 rounded-3xl space-y-4">
                            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                                <AlertCircle className="w-4 h-4" />
                                Important
                            </div>
                            <p className="text-sm text-gray-600 dark:text-zinc-400 font-medium leading-loose">
                                Pour toute question juridique ou litige relatif à une transaction, veuillez contacter notre département juridique à l'adresse suivante : <span className="text-primary font-bold">legal@citicline.com</span>.
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
