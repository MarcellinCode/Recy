import { Lock, Eye, CheckCircle, Database } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950">
            {/* Header */}
            <section className="pt-32 pb-16 border-b border-gray-100 dark:border-zinc-800">
                <div className="max-w-4xl mx-auto px-4">
                    <h1 className="text-[10px] font-black text-primary uppercase tracking-[0.5em] mb-4">Confidentialité</h1>
                    <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                        Politique de <br /> <span className="text-primary italic">Protection des Données</span>
                    </h2>
                    <p className="mt-6 text-sm text-gray-400 font-bold uppercase tracking-widest">Dernière mise à jour : 20 Avril 2026</p>
                </div>
            </section>

            {/* Content */}
            <section className="py-20">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="space-y-20">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <PrivacyCard 
                                icon={Database}
                                title="Données Collectées"
                                items={[
                                    "Identité (Nom, Prénom)",
                                    "Coordonnées (Email, Téléphone)",
                                    "Localisation (Points de collecte)",
                                    "Transactions financières (Wallet)"
                                ]}
                            />
                            <PrivacyCard 
                                icon={Eye}
                                title="Utilisation"
                                items={[
                                    "Gestion de votre compte",
                                    "Traitement des collectes de déchets",
                                    "Sécurité des paiements",
                                    "Statistiques d'impact écologique"
                                ]}
                            />
                        </div>

                        <div className="prose prose-zinc dark:prose-invert prose-headings:uppercase prose-headings:italic prose-headings:font-black prose-headings:tracking-tighter max-w-none">
                            <h3 className="text-2xl">1. Conservation des données</h3>
                            <p className="text-gray-500 dark:text-zinc-400 font-medium">
                                Nous conservons vos données aussi longtemps que nécessaire pour vous fournir nos services. Les données relatives aux transactions sont conservées plus longtemps pour répondre aux obligations légales et fiscales.
                            </p>

                            <h3 className="text-2xl mt-12">2. Partage avec des tiers</h3>
                            <p className="text-gray-500 dark:text-zinc-400 font-medium">
                                Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec nos partenaires de collecte (Mairies, Recycleurs) uniquement dans le cadre de l'exécution du service de salubrité urbaine.
                            </p>

                            <h3 className="text-2xl mt-12">3. Vos Droits</h3>
                            <p className="text-gray-500 dark:text-zinc-400 font-medium">
                                Conformément aux lois sur la protection des données, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Vous pouvez exercer ce droit via les paramètres de votre profil ou en nous écrivant.
                            </p>
                        </div>

                        <div className="p-8 bg-zinc-950 rounded-[3rem] text-white">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="p-4 bg-primary/20 rounded-2xl">
                                    <Lock className="w-10 h-10 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-black uppercase italic tracking-tighter">Sécurité Maximale</h4>
                                    <p className="text-zinc-400 text-sm font-medium">
                                        Nous utilisons des protocoles de chiffrement de pointe (SSL/TLS) pour protéger toutes vos communications et transactions financières sur CITICLINE.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
}

function PrivacyCard({ icon: Icon, title, items }: { icon: any; title: string; items: string[] }) {
    return (
        <div className="p-8 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-lg font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">{title}</h4>
            </div>
            <ul className="space-y-3">
                {items.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                        <CheckCircle className="w-3 h-3 text-primary" />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}
