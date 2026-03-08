"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Send, User, Trash2, Search, ArrowLeft, Loader2, Package } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function ChatPage() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const targetWasteId = searchParams.get("wasteId");

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedConv, setSelectedConv] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUser(user);

            // Fetch wastes where user is involved
            // 1. Where user is seller
            // 2. Where user is collector
            // 3. Where user has messages (to support pre-reservation chat)

            // First, get all waste IDs where the user has messages
            const { data: userMessages } = await supabase
                .from('messages')
                .select('waste_id')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

            const messageWasteIds = Array.from(new Set(userMessages?.map(m => m.waste_id) || []));

            let query = supabase
                .from('wastes')
                .select(`
                    id, 
                    status,
                    seller_id,
                    collector_id,
                    estimated_weight,
                    waste_types(name),
                    seller:profiles!seller_id(id, full_name),
                    collector:profiles!collector_id(id, full_name)
                `);

            if (messageWasteIds.length > 0) {
                query = query.or(`seller_id.eq.${user.id},collector_id.eq.${user.id},id.in.(${messageWasteIds.join(',')})`);
            } else {
                query = query.or(`seller_id.eq.${user.id},collector_id.eq.${user.id}`);
            }

            const { data: wastes, error } = await query.order('created_at', { ascending: false });

            if (error) console.error(error);

            const convList = wastes || [];
            // Deduplicate by ID
            const uniqueConvList = Array.from(new Map(convList.map(item => [item.id, item])).values());
            setConversations(uniqueConvList);

            // Auto-select if wasteId is in URL
            if (targetWasteId) {
                const found = convList.find(c => c.id === targetWasteId);
                if (found) {
                    setSelectedConv(found);
                } else {
                    // If not in the list (maybe because not yet involved), fetch it specifically
                    const { data: specificWaste } = await supabase
                        .from('wastes')
                        .select(`
                            id, 
                            status,
                            seller_id,
                            collector_id,
                            estimated_weight,
                            waste_types(name),
                            seller:profiles!seller_id(id, full_name),
                            collector:profiles!collector_id(id, full_name)
                        `)
                        .eq('id', targetWasteId)
                        .single();

                    if (specificWaste) {
                        setConversations(prev => {
                            const combined = [specificWaste, ...prev];
                            const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                            return unique;
                        });
                        setSelectedConv(specificWaste);
                    }
                }
            }

            setLoading(false);
        };

        fetchInitialData();
    }, [supabase, targetWasteId]);

    useEffect(() => {
        if (!selectedConv) return;

        const fetchMessages = async () => {
            setMessagesLoading(true);
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('waste_id', selectedConv.id)
                .order('created_at', { ascending: true });

            if (error) console.error(error);
            setMessages(data || []);
            setMessagesLoading(false);
            scrollToBottom();
        };

        fetchMessages();

        // Subscribe to real-time messages
        const channel = supabase
            .channel(`waste_${selectedConv.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `waste_id=eq.${selectedConv.id}`
            }, (payload) => {
                setMessages((prev) => [...prev, payload.new]);
                scrollToBottom();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedConv, supabase]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        // Determine receiver
        let receiverId = null;

        if (currentUser.id === selectedConv.seller_id) {
            // I am the seller, I reply to the collector
            receiverId = selectedConv.collector_id;

            // If no official collector yet (pre-reservation chat), find the other party from messages
            if (!receiverId && messages.length > 0) {
                const otherMsg = messages.find(m => m.sender_id !== currentUser.id);
                receiverId = otherMsg?.sender_id;
            }
        } else {
            // I am a collector/buyer, I message the seller
            receiverId = selectedConv.seller_id;
        }

        if (!receiverId) {
            console.error("Impossible de déterminer le destinataire. selectedConv:", selectedConv);
            return;
        }

        const msgContent = newMessage.trim();
        setNewMessage("");

        const { error } = await supabase
            .from('messages')
            .insert({
                waste_id: selectedConv.id,
                sender_id: currentUser.id,
                receiver_id: receiverId,
                content: msgContent
            });

        if (error) {
            console.error("Erreur d'envoi Supabase:", error);
        } else {
            console.log("Message envoyé avec succès !");
        }
    };

    const getOtherParty = (conv: any) => {
        if (!currentUser || !conv) return null;
        const isSeller = currentUser.id === conv.seller_id;
        const otherProfile = isSeller ? conv.collector : conv.seller;
        return {
            id: isSeller ? conv.collector_id : conv.seller_id,
            full_name: otherProfile?.full_name || (isSeller ? "En attente de collecteur" : "Vendeur")
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Ouverture du canal sécurisé...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-8rem)]">
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border-2 border-gray-100 dark:border-zinc-800 shadow-2xl overflow-hidden h-full flex">

                {/* Conversations Sidebar */}
                <div className={cn(
                    "w-full md:w-96 border-r-2 border-gray-50 dark:border-zinc-800 flex flex-col",
                    selectedConv && "hidden md:flex"
                )}>
                    <div className="p-8 border-b-2 border-gray-50 dark:border-zinc-800">
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-6 uppercase italic tracking-tighter">Messages</h1>
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
                            <input
                                type="text"
                                placeholder="Rechercher un lot..."
                                className="w-full pl-12 pr-6 py-3.5 bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {conversations.length > 0 ? conversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedConv(conv)}
                                className={cn(
                                    "w-full p-6 flex items-center gap-5 rounded-[2rem] transition-all text-left group",
                                    selectedConv?.id === conv.id
                                        ? "bg-primary text-white shadow-xl shadow-primary/20"
                                        : "hover:bg-gray-50 dark:hover:bg-zinc-800"
                                )}
                            >
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                                    selectedConv?.id === conv.id ? "bg-white/20" : "bg-gray-100 dark:bg-zinc-700"
                                )}>
                                    <User className={cn("w-7 h-7", selectedConv?.id === conv.id ? "text-white" : "text-gray-400")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={cn("font-black truncate uppercase text-xs tracking-widest", selectedConv?.id === conv.id ? "text-white" : "text-gray-900 dark:text-white")}>
                                            {getOtherParty(conv)?.full_name}
                                        </h3>
                                    </div>
                                    <p className={cn("text-[10px] font-bold truncate mb-1 uppercase tracking-wider", selectedConv?.id === conv.id ? "text-white/70" : "text-primary")}>
                                        {conv.waste_types?.name} • {conv.estimated_weight}kg
                                    </p>
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", selectedConv?.id === conv.id ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-400")}>
                                        {conv.status}
                                    </span>
                                </div>
                            </button>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 italic">
                                <MessageSquare className="w-12 h-12 mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest">Aucune discussion active</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={cn(
                    "flex-1 flex flex-col bg-white dark:bg-zinc-950",
                    !selectedConv && "hidden md:flex items-center justify-center p-12 text-center"
                )}>
                    {selectedConv ? (
                        <>
                            {/* Header */}
                            <div className="p-6 border-b-2 border-gray-50 dark:border-zinc-900 flex items-center justify-between bg-white dark:bg-zinc-900">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedConv(null)} className="md:hidden p-3 bg-gray-50 rounded-2xl">
                                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                                    </button>
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <User className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg italic">
                                            {getOtherParty(selectedConv)?.full_name}
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Canal Direct</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700">
                                    <Package className="w-4 h-4 text-primary" />
                                    <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                        Lot #{selectedConv.id.split('-')[0]}
                                    </span>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/30 dark:bg-zinc-950">
                                {messagesLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin opacity-30" />
                                    </div>
                                ) : messages.map((msg) => {
                                    const isMe = msg.sender_id === currentUser?.id;
                                    return (
                                        <div key={msg.id} className={cn(
                                            "flex flex-col max-w-[85%] group",
                                            isMe ? "ml-auto items-end" : "mr-auto items-start"
                                        )}>
                                            <div className={cn(
                                                "p-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm",
                                                isMe
                                                    ? "bg-primary text-white rounded-br-none"
                                                    : "bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-100 dark:border-zinc-700"
                                            )}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[9px] text-gray-400 mt-2 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-8 bg-white dark:bg-zinc-900 border-t-2 border-gray-50 dark:border-zinc-800">
                                <form onSubmit={handleSendMessage} className="flex gap-4">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Votre message pour ce lot..."
                                        className="flex-1 px-8 py-4 bg-gray-50 dark:bg-zinc-800 border-none rounded-[1.5rem] outline-none text-xs font-bold text-gray-900 dark:text-white ring-2 ring-transparent focus:ring-primary/20 transition-all"
                                    />
                                    <button
                                        type="submit"
                                        className="w-16 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <Send className="w-6 h-6" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center max-w-sm">
                            <div className="w-32 h-32 bg-primary/5 rounded-[3rem] flex items-center justify-center mb-10 shadow-inner">
                                <MessageSquare className="w-12 h-12 text-primary opacity-20" />
                            </div>
                            <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter italic">Négociations</h2>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed italic">
                                Sélectionnez une discussion pour finaliser les détails de la collecte et la pesée.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


