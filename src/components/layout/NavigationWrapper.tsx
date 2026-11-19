"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SessionProvider } from "@/components/providers/SessionProvider";

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isSuperAdmin = pathname?.startsWith("/admin");
    const isPublicMairie = pathname?.startsWith("/mairie/");
    const shouldHideNav = isSuperAdmin || isPublicMairie;

    // La session, le rôle, les badges et l'écoute des nouveaux messages sont
    // centralisés dans SessionProvider (un seul abonnement pour toute l'app).
    return (
        <SessionProvider>
            {!shouldHideNav && <Header />}

            <main className={shouldHideNav ? "" : "min-h-screen bg-gray-50/50 dark:bg-zinc-950"}>
                {children}
            </main>

            {!shouldHideNav && <Footer />}
        </SessionProvider>
    );
}
