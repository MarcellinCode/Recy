import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: any = {};

    try {
        // 1. Check Profiles columns
        const { data: profileCols, error: pError } = await supabase.rpc('inspect_table', { table_name: 'profiles' });
        results.profiles_cols = profileCols || pError;

        // 2. Check System Settings
        const { data: settings, error: sError } = await supabase.from('system_settings').select('*').limit(1);
        results.system_settings = settings || sError;

        // 3. Check Transactions
        const { data: txs, error: tError } = await supabase.from('transactions').select('*').limit(1);
        results.transactions = txs || tError;

    } catch (e: any) {
        results.unexpected_error = e.message;
    }

    return NextResponse.json(results);
}
