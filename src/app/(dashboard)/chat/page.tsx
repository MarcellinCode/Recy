"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Send, User, Search, ArrowLeft, Loader2, Package, Check, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

function ChatContainer() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const targetWasteId = searchParams.get("wasteId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentUser, setCurrentUser] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [conversations, setConversations] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedConv, setSelectedConv] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    
    // Advanced Chat Features State
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [isTyping, setIsTyping] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [activeChannel, setActiveChannel] = useState<any>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUser(user);

            const { error: markReadError } = await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('receiver_id', user.id)
                .eq('is_read', false);
            
            if (markReadError) console.error("Error marking all as read:", markReadError);
            else console.log("All messages marked as read");

            // Fetch wastes where user is involved
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
            // Mark unread messages directed to current user as read
            if (currentUser && data) {
                const unreadIds = data
                    .filter(msg => msg.receiver_id === currentUser.id && msg.is_read === false)
                    .map(msg => msg.id);

                if (unreadIds.length > 0) {
                    await supabase
                        .from('messages')
                        .update({ is_read: true })
                        .in('id', unreadIds);
                }
            }
        };

        fetchMessages();

        const channel = supabase
            .channel(`waste_${selectedConv.id}`, {
                config: {
                    presence: { key: currentUser?.id },
                },
            })
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const users = new Set<string>();
                for (const id in newState) {
                    users.add(id);
                }
                setOnlineUsers(users);
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.user_id !== currentUser?.id) {
                    setIsTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                }
            })
            .on('broadcast', { event: 'message' }, (payload) => {
                if (payload.payload.sender_id === currentUser?.id) return;
                
                console.log("CHAT BROADCAST MESSAGE:", payload);
                setMessages((prev) => {
                    const isDuplicate = prev.some(
                        msg => (msg.id === payload.payload.id) || 
                        (msg.content === payload.payload.content && 
                         msg.sender_id === payload.payload.sender_id && 
                         Math.abs(new Date(msg.created_at).getTime() - new Date(payload.payload.created_at).getTime()) < 2000)
                    );
                    if (isDuplicate) return prev;
                    return [...prev, payload.payload];
                });
                scrollToBottom();
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                console.log("CHAT POSTGRES MESSAGE:", payload);
                if (payload.new.waste_id !== selectedConv.id) return;

                // Mark as read immediately if the user is currently viewing this conversation
                if (currentUser && payload.new.receiver_id === currentUser.id && payload.new.is_read === false) {
                    supabase
                        .from('messages')
                        .update({ is_read: true })
                        .eq('id', payload.new.id)
                        .then(() => console.log("Incoming message marked as read instantly"));
                }

                setMessages((prev) => {
                    // Check if message already exists (via Optimistic update or Broadcast)
                    const existingIndex = prev.findIndex(msg => 
                        msg.id === payload.new.id || 
                        (msg.id.toString().startsWith('optimistic-') && 
                         msg.content === payload.new.content && 
                         msg.sender_id === payload.new.sender_id)
                    );

                    if (existingIndex !== -1) {
                        // Replace existing (optimistic/broadcast) with official DB record
                        const newMessages = [...prev];
                        newMessages[existingIndex] = payload.new;
                        return newMessages;
                    }

                    return [...prev, payload.new];
                });
                scrollToBottom();
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                // Update message state (e.g for read receipts)
                setMessages((prev) => prev.map(msg => msg.id === payload.new.id ? payload.new : msg));
            });

        channel.subscribe(async (status: string) => {
            console.log(`CHAT REALTIME STATUS (${selectedConv.id}): ${status}`);
            if (status === 'SUBSCRIBED' && currentUser) {
                await channel.track({ online_at: new Date().toISOString() });
            }
        });
        
        setActiveChannel(channel);

        return () => {
            supabase.removeChannel(channel);
            setActiveChannel(null);
        };
    }, [selectedConv, supabase]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        let receiverId = null;

        if (currentUser.id === selectedConv.seller_id) {
            receiverId = selectedConv.collector_id;
            if (!receiverId && messages.length > 0) {
                const otherMsg = messages.find(m => m.sender_id !== currentUser.id);
                receiverId = otherMsg?.sender_id;
            }
        } else {
            receiverId = selectedConv.seller_id;
        }

        if (!receiverId) return;

        const msgContent = newMessage.trim();
        if (!msgContent) return; // Don't send empty messages

        setNewMessage("");

        // Optimistic update: Add message to UI immediately
        const optimisticMessage = {
            id: `optimistic-${Date.now()}`,
            waste_id: selectedConv.id,
            sender_id: currentUser.id,
            receiver_id: receiverId,
            content: msgContent,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        scrollToBottom();

        // Broadcast for pure real-time speed
        // Broadcast the message immediately
        if (activeChannel) {
            activeChannel.send({
                type: 'broadcast',
                event: 'message',
                payload: optimisticMessage
            });
        }

        // Haptic feedback
        const { hapticFeedback } = await import("@/lib/haptics");
        hapticFeedback.light();

        const { error } = await supabase
            .from('messages')
            .insert({
                waste_id: selectedConv.id,
                sender_id: currentUser.id,
                receiver_id: receiverId,
                content: msgContent
            });
        if (error) {
            console.error("Error sending message:", error);
            // Optionally, remove the optimistic message on failure
            // setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id));
        }
    };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (activeChannel) {
            activeChannel.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: currentUser?.id }
            }).catch(() => {});
        }
    };

    const SELLER_REPLIES = ["Le lot est prêt !", "Pouvez-vous confirmer le poids ?", "Merci beaucoup !"];
    const COLLECTOR_REPLIES = ["Je suis en route 🚚", "J'arrive dans 10 minutes", "Lot bien récupéré !"];

    const getQuickReplies = () => {
        if (!currentUser || !selectedConv) return [];
        return currentUser.id === selectedConv.seller_id ? SELLER_REPLIES : COLLECTOR_REPLIES;
    };

    const handleQuickReply = (reply: string) => {
        setNewMessage(reply);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8 py-0 sm:py-8 h-[calc(100dvh-8rem)] flex flex-col pb-safe">
            <div className="bg-white dark:bg-zinc-900 sm:rounded-[3rem] border-b sm:border-2 border-gray-100 dark:border-zinc-800 shadow-2xl overflow-hidden flex-1 flex">
                <div className={cn("w-full md:w-96 border-r-2 border-gray-50 dark:border-zinc-800 flex flex-col", selectedConv && "hidden md:flex")}>
                    <div className="p-6 sm:p-8 border-b-2 border-gray-50 dark:border-zinc-800">
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-4 sm:mb-6 uppercase italic tracking-tighter">Messages</h1>
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
                            <input type="text" placeholder="Rechercher un lot..." className="w-full pl-12 pr-6 py-3.5 bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {conversations.length > 0 ? conversations.map((conv) => (
                            <button key={conv.id} onClick={() => setSelectedConv(conv)} className={cn("w-full p-6 flex items-center gap-5 rounded-[2rem] transition-all text-left group", selectedConv?.id === conv.id ? "bg-primary text-white shadow-xl shadow-primary/20" : "hover:bg-gray-50 dark:hover:bg-zinc-800")}>
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", selectedConv?.id === conv.id ? "bg-white/20" : "bg-gray-100 dark:bg-zinc-700")}>
                                    <User className={cn("w-7 h-7", selectedConv?.id === conv.id ? "text-white" : "text-gray-400")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={cn("font-black truncate uppercase text-xs tracking-widest", selectedConv?.id === conv.id ? "text-white" : "text-gray-900 dark:text-white")}>{getOtherParty(conv)?.full_name}</h3>
                                    <p className={cn("text-[10px] font-bold truncate mb-1 uppercase tracking-wider", selectedConv?.id === conv.id ? "text-white/70" : "text-primary")}>{conv.waste_types?.name} • {conv.estimated_weight}kg</p>
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", selectedConv?.id === conv.id ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-400")}>{conv.status}</span>
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

                <div className={cn("flex-1 flex flex-col bg-white dark:bg-zinc-950", !selectedConv && "hidden md:flex items-center justify-center p-12 text-center")}>
                    {selectedConv ? (
                        <>
                            <div className="p-6 border-b-2 border-gray-50 dark:border-zinc-900 flex items-center justify-between bg-white dark:bg-zinc-900">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedConv(null)} className="md:hidden p-3 bg-gray-50 rounded-2xl"><ArrowLeft className="w-5 h-5 text-gray-400" /></button>
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><User className="w-6 h-6 text-primary" /></div>
                                    <div>
                                        <h2 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg italic">{getOtherParty(selectedConv)?.full_name}</h2>
                                        <div className="flex items-center gap-2">
                                            {onlineUsers.has(getOtherParty(selectedConv)?.id) ? (
                                                <>
                                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">En ligne</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-zinc-700" />
                                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Hors ligne</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700">
                                    <Package className="w-4 h-4 text-primary" />
                                    <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Lot #{selectedConv.id.split('-')[0]}</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:y-8 bg-gray-50/30 dark:bg-zinc-950">
                                {messagesLoading ? (
                                    <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-primary animate-spin opacity-30" /></div>
                                ) : messages.map((msg) => {
                                    const isMe = msg.sender_id === currentUser?.id;
                                    return (
                                        <div key={msg.id} className={cn("flex flex-col max-w-[85%] group", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                                            <div className={cn("p-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm", isMe ? "bg-primary text-white rounded-br-none" : "bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-100 dark:border-zinc-700")}>{msg.content}</div>
                                            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMe && (
                                                    msg.id.toString().startsWith('optimistic-') ? (
                                                        <Check className="w-3 h-3 text-gray-300" />
                                                    ) : msg.is_read ? (
                                                        <CheckCheck className="w-3 h-3 text-blue-500" />
                                                    ) : (
                                                        <CheckCheck className="w-3 h-3 text-gray-400" />
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-4 sm:p-8 bg-white dark:bg-zinc-900 border-t-2 border-gray-50 dark:border-zinc-800 flex flex-col gap-3 sm:gap-4 pb-24 md:pb-8 relative overflow-visible">
                                {isTyping && (
                                    <div className="text-[10px] text-primary font-black uppercase tracking-widest animate-pulse flex items-center gap-2 px-2">
                                        <span className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </span>
                                        {getOtherParty(selectedConv)?.full_name} est en train d&apos;écrire...
                                    </div>
                                )}
                                
                                {getQuickReplies().length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                        {getQuickReplies().map((reply, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => handleQuickReply(reply)}
                                                className="whitespace-nowrap px-4 py-2 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-colors border border-gray-100 dark:border-zinc-700 cursor-pointer"
                                            >
                                                {reply}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <form 
                                    onSubmit={handleSendMessage} 
                                    className="flex items-center justify-end gap-2 sm:gap-4 w-full relative z-30"
                                >
                                    <div className="flex-none w-[60%] sm:flex-1 relative ml-auto">
                                        <input 
                                            type="text" 
                                            value={newMessage} 
                                            onChange={handleTyping} 
                                            placeholder="PUSHED RIGHT..." 
                                            className="w-full px-4 sm:px-8 py-3.5 sm:py-4 bg-gray-50 dark:bg-zinc-800 border-none rounded-[1.5rem] outline-none text-sm font-medium text-gray-900 dark:text-white ring-2 ring-primary/20 focus:ring-primary transition-all shadow-inner" 
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={!newMessage.trim()}
                                        className={cn(
                                            "flex-none w-12 h-12 sm:w-16 sm:h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl outline-none",
                                            newMessage.trim() 
                                                ? "bg-primary text-white shadow-primary/30 hover:scale-105 active:scale-95" 
                                                : "bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-gray-600 cursor-not-allowed"
                                        )}
                                        aria-label="Envoyer"
                                    >
                                        <Send className="w-5 h-5 sm:w-6 h-6" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center max-w-sm">
                            <div className="w-32 h-32 bg-primary/5 rounded-[3rem] flex items-center justify-center mb-10 shadow-inner"><MessageSquare className="w-12 h-12 text-primary opacity-20" /></div>
                            <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter italic">Négociations</h2>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed italic">Sélectionnez une discussion pour finaliser les détails de la collecte et la pesée.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Chargement des discussions...</p>
            </div>
        }>
            <ChatContainer />
        </Suspense>
    );
}


