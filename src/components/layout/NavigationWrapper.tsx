"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Footer } from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const isSuperAdmin = pathname?.startsWith("/admin");
    const isPublicMairie = pathname?.startsWith("/mairie/");
    const shouldHideNav = isSuperAdmin || isPublicMairie;

    // Initialiser directement avec localStorage pour éviter le flicker blanc/noir
    const [forceDark, setForceDark] = useState(() => {
        if (typeof globalThis.window !== 'undefined') {
            const cachedRole = globalThis.localStorage.getItem('user-role');
            return ['mairie', 'entreprise', 'organisation_admin'].includes(cachedRole || '');
        }
        return false;
    });

    // 1. Détecter le rôle et gérer le thème (exécuté UNE SEULE FOIS au montage)
    useEffect(() => {
        const syncTheme = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                
                const role = profile?.role || null;
                if (role) {
                    globalThis.localStorage.setItem('user-role', role);
                    setForceDark(['mairie', 'entreprise', 'organisation_admin'].includes(role));
                }
            } else {
                setForceDark(false);
            }
        };

        syncTheme();

        // Écouter les changements d'authentification pour adapter le thème instantanément
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
            if (session?.user) {
                syncTheme();
            } else {
                globalThis.localStorage.removeItem('user-role');
                setForceDark(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Gestion des notifications en temps réel (réagit au changement de page pour le filtrage)
    useEffect(() => {
        if (shouldHideNav) return;

        let channel: any;

        const setupListener = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            channel = supabase
                .channel('global_web_messages')
                .on(
                    'postgres_changes',
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'messages',
                        filter: `receiver_id=eq.${user.id}`
                    },
                    async (payload: any) => {
                        // Ne pas notifier si on est déjà sur le chat lié à ce lot/personne
                        const isChatPage = pathname?.includes("/chat");
                        
                        if (!isChatPage) {
                            // Récupérer le nom de l'expéditeur
                            const { data: sender } = await supabase
                                .from('profiles')
                                .select('full_name')
                                .eq('id', payload.new.sender_id)
                                .single();

                            showToast(
                                `${sender?.full_name || 'Nouveau message'}: ${payload.new.content.substring(0, 50)}${payload.new.content.length > 50 ? '...' : ''}`,
                                "info"
                            );
                        }
                    }
                )
                .subscribe();
        };

        setupListener();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [pathname, shouldHideNav]);

    return (
        <div className={cn(forceDark ? "dark" : "")}>
            {!shouldHideNav && <Header />}
            
            <main className={cn(
                shouldHideNav ? "" : "min-h-screen bg-gray-50/50 dark:bg-zinc-950",
                forceDark ? "bg-zinc-950 text-white" : ""
            )}>
                {children}
            </main>

            {!shouldHideNav && <BottomNavigation />}
            {!shouldHideNav && <Footer />}
        </div>
    );
}
