import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        redirect("/connexion");
    }

    // Récupération des données en parallèle sur le serveur
    const [profRes, wastesRes] = await Promise.all([
        supabase.from('profiles').select('id,full_name,role,city,eco_points,wallet_balance').eq('id', user.id).maybeSingle(),
        supabase.from('wastes').select('id,final_weight,estimated_weight,status').or(`seller_id.eq.${user.id},collector_id.eq.${user.id}`)
    ]);

    const profile = profRes.data;
    const wastes = wastesRes.data || [];

    const totalWeight = wastes.reduce((acc: number, w: any) => acc + (w.final_weight || w.estimated_weight || 0), 0);
    const co2Saved = totalWeight * 1.22;
    const ecoPoints = profile?.eco_points || 0;
    const collectionsCount = wastes.length;

    let citizenCount = 0;
    if (profile?.role === 'mairie' && profile?.city) {
        try {
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'vendeur')
                .ilike('city', `%${profile.city}%`);
            citizenCount = count || 0;
        } catch (e) {
            console.error("Error fetching citizen count on server:", e);
        }
    }

    const stats = {
        totalWeight,
        co2Saved,
        ecoPoints,
        collectionsCount,
        citizenCount
    };

    return <DashboardClient profile={profile} stats={stats} />;
}
