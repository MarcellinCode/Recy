import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function diagnostic() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        console.log("No session found")
        return
    }

    const { user } = session
    console.log(`Current User ID: ${user.id}`)

    const { data: messages, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('receiver_id', user.id)
        .eq('is_read', false)

    console.log(`Total unread messages: ${count}`)
    if (messages) {
        messages.forEach(m => {
            console.log(`Msg ID: ${m.id}, Content: "${m.content.substring(0, 20)}...", WasteID: ${m.waste_id}, Sender: ${m.sender_id}`)
        })
    }
}

diagnostic()
