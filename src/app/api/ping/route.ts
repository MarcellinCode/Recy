import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    
    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json({ 
            success: false, 
            error: "Missing Supabase configuration environment variables" 
        }, { status: 500 });
    }

    // On utilise la clé anonyme publique car c'est un ping anonyme, 
    // suffisant pour réveiller la base sans contourner la sécurité RLS.
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const start = Date.now();
    try {
        // Requête très légère sur une table existante pour déclencher l'activité
        const { error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);

        const durationMs = Date.now() - start;

        if (error) {
            // Même si on obtient une erreur RLS ou autre, tant que c'est une réponse de la DB,
            // cela signifie que le serveur Postgres est réveillé.
            return NextResponse.json({ 
                success: true, 
                warning: "Query completed with database response but returned an error",
                error: error.message, 
                durationMs,
                timestamp: new Date().toISOString()
            });
        }

        return NextResponse.json({ 
            success: true, 
            message: "Pong - RecyCla database is awake!", 
            durationMs,
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        return NextResponse.json({ 
            success: false, 
            error: e.message 
        }, { status: 500 });
    }
}
