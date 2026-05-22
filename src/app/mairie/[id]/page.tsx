import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { 
    MapPin, 
    ShieldCheck, 
    TrendingUp, 
    Users, 
    Leaf, 
    ArrowRight, 
    Building2,
    CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PageProps {
    readonly params: Promise<{
        readonly id: string;
    }>;
}
 
export default async function MairieLandingPage({ params }: Readonly<PageProps>) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: mairie, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !mairie || (mairie.role !== 'mairie' && mairie.role !== 'organisation_admin')) {
        return notFound();
    }

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950">
            {/* HERO SECTION */}
            <section className="relative w-full min-h-[80vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://www.kaweru.com/wp-content/uploads/2025/12/Cotonou.jpg"
                        alt={`Ville de ${mairie.city || 'la commune'}`}
                        className="w-full h-full object-cover scale-105 brightness-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40"></div>
                </div>

                <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 text-center flex flex-col items-center">
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 border border-primary/20 rounded-full bg-primary/10 backdrop-blur-md text-primary mb-8 shadow-2xl shadow-primary/20">
                        <Building2 className="w-4 h-4" />
                        <span className="text-[10px] font-black tracking-widest uppercase">Portail Municipal Officiel</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white uppercase italic leading-none max-w-5xl mb-6 drop-shadow-2xl">
                        {mairie.full_name}
                    </h1>

                    <div className="flex items-center justify-center gap-6 text-gray-300 mb-12">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            <span className="text-sm font-black uppercase tracking-widest">{mairie.city || 'Ville non renseignée'}</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-emerald-500" />
                            <span className="text-sm font-black uppercase tracking-widest">Partenaire depuis {new Date(mairie.created_at).getFullYear()}</span>
                        </div>
                    </div>

                    <p className="max-w-3xl text-lg md:text-xl text-gray-400 font-bold uppercase tracking-widest leading-loose mb-12">
                        La ville s'engage pour un environnement plus sain, plus vert et plus durable avec CITICLINE. Rejoignez le mouvement citoyen.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6">
                        <Link
                            href={`/mairie/${mairie.id}/connexion`}
                            className="flex items-center justify-center px-12 py-6 text-xs font-black text-white transition-all shadow-2xl rounded-[2rem] bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-primary/20 uppercase tracking-[0.2em]"
                        >
                            Accéder au Dashboard de la Mairie
                            <ArrowRight className="w-5 h-5 ml-3" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* IMPACT EN TEMPS RÉEL (PLACEHOLDER DATA) */}
            <section className="py-24 bg-white dark:bg-zinc-950 relative -mt-20 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard 
                            icon={Leaf}
                            value="45 T"
                            label="Déchets Recyclés"
                            color="text-emerald-500"
                            bg="bg-emerald-500/10"
                        />
                        <StatCard 
                            icon={Users}
                            value="1,240"
                            label="Citoyens Engagés"
                            color="text-blue-500"
                            bg="bg-blue-500/10"
                        />
                        <StatCard 
                            icon={TrendingUp}
                            value="-12%"
                            label="Émissions CO2"
                            color="text-amber-500"
                            bg="bg-amber-500/10"
                        />
                    </div>
                </div>
            </section>

            {/* ÉQUIPEMENTS & SERVICES */}
            <section className="py-32 bg-gray-50 dark:bg-zinc-900 border-y border-gray-100 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Infrastructures</h2>
                        <h3 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                            Services de <span className="text-primary italic">Proximité</span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-12 bg-white dark:bg-zinc-950 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-100/50 dark:shadow-none transition-all hover:border-primary/50">
                            <ShieldCheck className="w-12 h-12 text-primary mb-8" />
                            <h4 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-4">Collecte Domiciliaire</h4>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-loose">
                                Programme officiel d'enlèvement des ordures ménagères. Abonnez-vous via Citicline pour une gestion sans faille et certifiée par votre mairie.
                            </p>
                        </div>
                        <div className="p-12 bg-white dark:bg-zinc-950 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-100/50 dark:shadow-none transition-all hover:border-emerald-500/50">
                            <MapPin className="w-12 h-12 text-emerald-500 mb-8" />
                            <h4 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-4">Points d'Apport Volontaire</h4>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-loose">
                                Trouvez les centres de tri les plus proches de chez vous pour valoriser vos recyclables et gagnez de l'argent instantanément.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CALL TO ACTION */}
            <section className="py-40 bg-zinc-950 text-center relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full"></div>
                </div>
                <div className="relative z-10 max-w-4xl mx-auto px-4">
                    <h2 className="text-5xl md:text-7xl font-black text-white mb-8 uppercase tracking-tighter italic drop-shadow-2xl">
                        Agissez avec <span className="text-primary italic">{mairie.city || 'votre ville'}</span>
                    </h2>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-[0.2em] mb-12 leading-loose">
                        Transformons ensemble nos quartiers en modèles de salubrité urbaine.
                    </p>
                    <Link
                        href={`/mairie/${mairie.id}/connexion`}
                        className="inline-flex items-center justify-center px-12 py-6 text-xs font-black text-zinc-900 transition-all shadow-2xl rounded-[2rem] bg-white hover:bg-gray-100 hover:scale-105 active:scale-95 uppercase tracking-[0.2em]"
                    >
                        Connexion Administration
                    </Link>
                </div>
            </section>
        </div>
    );
}

interface StatCardProps {
    readonly icon: React.ComponentType<any>;
    readonly value: string;
    readonly label: string;
    readonly color: string;
    readonly bg: string;
}

function StatCard({ icon: Icon, value, label, color, bg }: Readonly<StatCardProps>) {
    return (
        <div className="p-8 bg-zinc-900 rounded-[2.5rem] border border-zinc-800 flex items-center gap-6 group hover:border-zinc-700 transition-colors shadow-2xl">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center shrink-0", bg)}>
                <Icon className={cn("w-8 h-8", color)} />
            </div>
            <div>
                <p className="text-4xl font-black text-white italic tracking-tighter mb-1 select-none">{value}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
            </div>
        </div>
    );
}
