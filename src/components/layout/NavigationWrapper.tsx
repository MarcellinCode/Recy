"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isSuperAdmin = pathname?.startsWith("/admin/super");

    return (
        <>
            {!isSuperAdmin && <Header />}
            
            <main className={isSuperAdmin ? "" : "min-h-screen bg-gray-50/50 dark:bg-zinc-950/50"}>
                {children}
            </main>

            {!isSuperAdmin && <BottomNavigation />}
        </>
    );
}
