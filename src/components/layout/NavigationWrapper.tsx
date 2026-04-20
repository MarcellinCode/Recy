"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const isSuperAdmin = pathname?.startsWith("/admin");
    const isPublicMairie = pathname?.startsWith("/mairie/");
    const shouldHideNav = isSuperAdmin || isPublicMairie;

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
        <>
            {!shouldHideNav && <Header />}
            
            <main className={shouldHideNav ? "" : "min-h-screen bg-gray-50/50 dark:bg-zinc-950/50"}>
                {children}
            </main>

            {!shouldHideNav && <BottomNavigation />}
            {!shouldHideNav && <Footer />}
        </>
    );
}
