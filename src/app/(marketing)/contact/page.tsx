import { Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";

export default function ContactPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Header Hero */}
            <section className="relative pt-32 pb-20 overflow-hidden bg-white dark:bg-zinc-950">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center">
                        <h1 className="text-[10px] font-black text-primary uppercase tracking-[0.5em] mb-6">Contactez-nous</h1>
                        <h2 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic mb-8">
                            Une question sur <br className="hidden md:block" /> la <span className="text-primary italic">Salubrité</span> ?
                        </h2>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-20 bg-gray-50 dark:bg-zinc-900 flex-grow">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                        {/* Info Column */}
                        <div className="space-y-12">
                            <div className="space-y-6">
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Support & Partenariats</h3>
                                <p className="text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
                                    Que vous soyez un citoyen, une mairie souhaitant moderniser son territoire, ou une entreprise de collecte, notre équipe est là pour vous accompagner.
                                </p>
                            </div>

                            <div className="space-y-8">
                                <ContactInfoItem 
                                    icon={Mail} 
                                    title="Email Direct" 
                                    value="contact@citicline.com" 
                                />
                                <ContactInfoItem 
                                    icon={Phone} 
                                    title="Assistance Téléphonique" 
                                    value="+229 01 00 00 00 00" 
                                />
                                <ContactInfoItem 
                                    icon={MapPin} 
                                    title="Siège Social" 
                                    value="Cotonou, Bénin / Abidjan, Côte d'Ivoire" 
                                />
                            </div>
                        </div>

                        {/* Form Column */}
                        <div className="p-10 bg-white dark:bg-zinc-800 rounded-[3rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-zinc-700">
                            <form className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Nom Complet</label>
                                        <input 
                                            type="text" 
                                            placeholder="John Doe" 
                                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-900 border-none rounded-2xl focus:ring-2 focus:ring-primary/30 transition-all font-medium text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Email</label>
                                        <input 
                                            type="email" 
                                            placeholder="john@example.com" 
                                            className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-900 border-none rounded-2xl focus:ring-2 focus:ring-primary/30 transition-all font-medium text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Sujet</label>
                                    <select className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-900 border-none rounded-2xl focus:ring-2 focus:ring-primary/30 transition-all font-medium text-gray-900 dark:text-white appearance-none">
                                        <option>Partenariat Mairie</option>
                                        <option>Support Citoyen</option>
                                        <option>Devenir Collecteur</option>
                                        <option>Autre</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Message</label>
                                    <textarea 
                                        rows={5} 
                                        placeholder="Comment pouvons-nous vous aider ?" 
                                        className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-900 border-none rounded-2xl focus:ring-2 focus:ring-primary/30 transition-all font-medium text-gray-900 dark:text-white resize-none"
                                    ></textarea>
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full flex items-center justify-center gap-3 px-10 py-5 bg-primary text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/30 uppercase tracking-widest text-xs"
                                >
                                    Envoyer le message
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function ContactInfoItem({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
    return (
        <div className="flex items-start gap-5">
            <div className="p-4 bg-primary/10 rounded-2xl">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</h4>
                <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase italic">{value}</p>
            </div>
        </div>
    );
}
