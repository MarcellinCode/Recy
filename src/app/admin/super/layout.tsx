import { SuperAdminSidebar } from "@/components/layout/SuperAdminSidebar";

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-gray-50/50 dark:bg-zinc-950/50">
            <SuperAdminSidebar />
            <div className="flex-1 lg:ml-72 flex flex-col min-h-screen">
                <main className="flex-1 p-8 lg:p-12">
                    {children}
                </main>
            </div>
        </div>
    );
}
