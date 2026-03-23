"use client";

import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { 
    MessageSquare, Send, User, Search, ArrowLeft, 
    Loader2, Package, Check, CheckCheck, ChevronDown 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// --- Types ---
type Profile = {
    id: string;
    full_name: string;
};

type WasteType = {
    name: string;
};

type Conversation = {
    id: string;
    status: string;
    seller_id: string;
    collector_id: string | null;
    estimated_weight: number;
    waste_types: WasteType;
    seller: Profile;
    collector: Profile | null;
    unreadCount?: number;
};

type Message = {
    id: string | number;
    waste_id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
};

// --- Sub-components ---

function Bubble({ msg, isMe, isLast }: { msg: Message; isMe: boolean; isLast: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
                "flex flex-col max-w-[85%] sm:max-w-[75%] relative mb-1",
                isMe ? "ml-auto items-end" : "mr-auto items-start"
            )}
        >
            <div
                className={cn(
                    "px-4 py-2.5 rounded-2xl text-[13px] sm:text-sm leading-relaxed shadow-sm",
                    isMe 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-100 dark:border-zinc-700"
                )}
            >
                {msg.content}
                <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={cn(
                        "text-[9px] font-medium uppercase tracking-tight",
                        isMe ? "text-white/70" : "text-zinc-400"
                    )}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                        msg.id.toString().startsWith('optimistic-') ? (
                            <Check className="w-3 h-3 text-white/50" />
                        ) : msg.is_read ? (
                            <CheckCheck className="w-3 h-3 text-blue-200" />
                        ) : (
                            <CheckCheck className="w-3 h-3 text-white/40" />
                        )
                    )}
                </div>
            </div>
            {isLast && (
                <div 
                    className={cn(
                        "absolute top-0 w-2 h-2",
                        isMe 
                            ? "-right-1 bg-primary [clip-path:polygon(0_0,0_100%,100%_0)]" 
                            : "-left-1 bg-white dark:bg-zinc-800 [clip-path:polygon(0_0,100%_0,100%_100%)] border-t border-zinc-100 dark:border-zinc-700"
                    )} 
                />
            )}
        </motion.div>
    );
}

function ChatContainer() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const targetWasteId = searchParams.get("wasteId");

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [isTyping, setIsTyping] = useState(false);
    const [activeChannel, setActiveChannel] = useState<any>(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Data Fetching ---

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUser(user);

            // 1. Fetch ALL wastes to find those involving the user
            const { data: allWastes } = await supabase
                .from('wastes')
                .select(`
                    id, status, seller_id, collector_id, estimated_weight,
                    waste_types(name),
                    seller:profiles!seller_id(id, full_name),
                    collector:profiles!collector_id(id, full_name)
                `)
                .order('created_at', { ascending: false });

            // 2. Identify wastes where user is seller, collector, OR has messages
            const { data: userMessages } = await supabase
                .from('messages')
                .select('waste_id, is_read, receiver_id')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

            const wasteIdsWithMessages = new Set((userMessages || []).map((m: any) => m.waste_id).filter(Boolean));

            const filteredWastes = (allWastes || []).filter((w: any) => 
                w.seller_id === user.id || 
                w.collector_id === user.id || 
                wasteIdsWithMessages.has(w.id)
            );

            // 3. Calculate unread counts
            const unreadCountsMap = (userMessages || []).reduce((acc: any, msg: any) => {
                if (msg.receiver_id === user.id && !msg.is_read) {
                    acc[msg.waste_id] = (acc[msg.waste_id] || 0) + 1;
                }
                return acc;
            }, {});

            const conversationsWithBadges = filteredWastes.map((conv: any) => ({
                ...conv,
                unreadCount: unreadCountsMap[conv.id] || 0
            }));

            setConversations(conversationsWithBadges as any[]);
            setLoading(false);

            if (targetWasteId) {
                const found = conversationsWithBadges.find((c: any) => c.id === targetWasteId);
                if (found) setSelectedConv(found as any);
            }
            setLoading(false);
        };
        fetchInitialData();
    }, [targetWasteId]);

    // --- Actions ---

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowScrollBottom(false);
    }, []);

    const appendMessage = useCallback((msg: Message) => {
        setMessages(prev => {
            const msgIdStr = msg.id.toString();
            
            // 1. Precise ID check (normalize 100% to string)
            const existsById = prev.some(m => m.id.toString() === msgIdStr);
            if (existsById) return prev;

            // 2. Fuzzy match for optimistic/real merging (Sender side only)
            // We only look for optimistic messages that match the content/sender/timing
            const msgContentNormalized = msg.content.trim();
            const msgTime = new Date(msg.created_at).getTime();

            const optimisticIndex = prev.findIndex(m => 
                m.id.toString().startsWith('optimistic-') &&
                m.sender_id === msg.sender_id &&
                m.content.trim() === msgContentNormalized &&
                Math.abs(new Date(m.created_at).getTime() - msgTime) < 120000 
            );

            if (optimisticIndex !== -1) {
                // If the incoming message is "real" (database), replace the optimistic one
                if (!msgIdStr.startsWith('optimistic-')) {
                    const newMessages = [...prev];
                    newMessages[optimisticIndex] = msg;
                    return newMessages;
                }
                // If both are optimistic, keep existing
                return prev;
            }

            // 3. Prevent receiver duplicates IF the message already exists via another event
            // (Strictly defensive for edge cases)
            const isBroadlyDuplicate = prev.some(m => 
                m.sender_id === msg.sender_id && 
                m.content.trim() === msgContentNormalized &&
                Math.abs(new Date(m.created_at).getTime() - msgTime) < 2000 // Very tight window for real duplicates
            );
            if (isBroadlyDuplicate && !msgIdStr.startsWith('optimistic-')) return prev;

            return [...prev, msg];
        });
        
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
            if (isAtBottom) setTimeout(scrollToBottom, 50);
            else setShowScrollBottom(true);
        }
    }, [scrollToBottom]);

    // --- Realtime Subscriptions ---

    useEffect(() => {
        if (!selectedConv || !currentUser) return;

        const fetchMessages = async () => {
            setMessagesLoading(true);
            const otherUserId = selectedConv.seller_id === currentUser.id ? selectedConv.collector_id : selectedConv.seller_id;
            
            let query = supabase.from('messages').select('*').order('created_at', { ascending: true });
            
            if (otherUserId) {
                // Fetch messages for this waste_id OR messages without waste_id exchanged with the other user
                query = query.or(`waste_id.eq.${selectedConv.id},and(waste_id.is.null,or(sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}))`);
            } else {
                query = query.eq('waste_id', selectedConv.id);
            }

            const { data } = await query;
            setMessages(data || []);
            setMessagesLoading(false);
            setTimeout(scrollToBottom, 100);
        };

        fetchMessages();

        const channel = supabase
            .channel(`waste_${selectedConv.id}`, { config: { presence: { key: currentUser.id } } })
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const users = new Set<string>();
                for (const id in newState) users.add(id);
                setOnlineUsers(users);
            })
            .on('broadcast', { event: 'typing' }, (payload: any) => {
                if (payload.payload.user_id !== currentUser.id) {
                    setIsTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
                const msg = payload.new as Message;
                const otherUserId = selectedConv.seller_id === currentUser.id ? selectedConv.collector_id : selectedConv.seller_id;
                
                const isExactMatch = msg.waste_id === selectedConv.id;
                const isFallbackMatch = !msg.waste_id && otherUserId && (msg.sender_id === otherUserId || msg.receiver_id === otherUserId);
                
                if (!isExactMatch && !isFallbackMatch) return;
                appendMessage(msg);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload: any) => {
                setMessages(prev => prev.map(msg => msg.id.toString() === payload.new.id.toString() ? { ...msg, ...payload.new } : msg));
            });

        channel.subscribe(async (status: any) => {
            if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() });
        });
        
        setActiveChannel(channel);

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedConv, currentUser, supabase, appendMessage, scrollToBottom]);

    // Dedicated effect to MARK AS READ all incoming messages
    useEffect(() => {
        if (!selectedConv || !currentUser || !messages.length) return;

        const markAsRead = async () => {
            const unreadIds = messages
                .filter(msg => 
                    msg.receiver_id === currentUser.id && 
                    !msg.is_read && 
                    msg.waste_id === selectedConv.id
                )
                .map(msg => msg.id);

            if (unreadIds.length > 0) {
                const { error } = await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .in('id', unreadIds);
                
                if (!error) {
                    // Locally update state for messages
                    setMessages(prev => prev.map(m => 
                        unreadIds.includes(m.id) ? { ...m, is_read: true } : m
                    ));

                    // Locally update conversation unread count
                    setConversations(prev => prev.map(conv => 
                        conv.id === selectedConv.id ? { ...conv, unreadCount: 0 } : conv
                    ));
                }
            }
        };

        markAsRead();
    }, [messages, selectedConv, currentUser, supabase]);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        if (isAtBottom) setShowScrollBottom(false);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConv || !currentUser) return;

        const receiverId = currentUser.id === selectedConv.seller_id 
            ? selectedConv.collector_id 
            : selectedConv.seller_id;
        
        if (!receiverId) return;

        const content = newMessage.trim();
        setNewMessage("");

        // Optimistic
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticMsg = {
            id: optimisticId,
            waste_id: selectedConv.id,
            sender_id: currentUser.id,
            receiver_id: receiverId,
            content,
            created_at: new Date().toISOString(),
            is_read: false
        };

        appendMessage(optimisticMsg);
        
        const { hapticFeedback } = await import("@/lib/haptics");
        hapticFeedback.light();

        await supabase.from('messages').insert({
            waste_id: selectedConv.id,
            sender_id: currentUser.id,
            receiver_id: receiverId,
            content
        });
    };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (activeChannel) {
            activeChannel.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: currentUser?.id }
            });
        }
    };

    const otherParty = useMemo(() => {
        if (!selectedConv || !currentUser) return null;
        const isSeller = currentUser.id === selectedConv.seller_id;
        const profile = isSeller ? selectedConv.collector : selectedConv.seller;
        return {
            id: isSeller ? selectedConv.collector_id : selectedConv.seller_id,
            name: profile?.full_name || (isSeller ? "En attente..." : "Vendeur")
        };
    }, [selectedConv, currentUser]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Canal sécurisé...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-0 md:px-4 lg:px-8 py-0 md:py-8 h-[calc(100svh-4rem)] md:h-[calc(100svh-8rem)] flex flex-col relative min-h-0">
            <div className="bg-white dark:bg-zinc-900 md:rounded-[2.5rem] md:border-2 border-zinc-100 dark:border-zinc-800 md:shadow-2xl overflow-hidden flex-1 flex min-h-0">
                
                {/* Sidebar (Conversations) */}
                <div className={cn(
                    "w-full md:w-80 lg:w-96 border-r border-zinc-50 dark:border-zinc-800 flex flex-col min-h-0",
                    selectedConv && "hidden md:flex"
                )}>
                    <div className="p-6 border-b border-zinc-50 dark:border-zinc-800">
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Messages</h1>
                        <div className="relative">
                            <Search className="absolute left-4 top-3 w-4 h-4 text-zinc-300" />
                            <input 
                                type="text" 
                                placeholder="Rechercher..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-xs font-bold outline-none" 
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {conversations.map((conv) => (
                            <button 
                                key={conv.id} 
                                onClick={() => setSelectedConv(conv)}
                                className={cn(
                                    "w-full p-4 flex items-center gap-4 rounded-[1.5rem] transition-all text-left",
                                    selectedConv?.id === conv.id 
                                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                )}
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                    selectedConv?.id === conv.id ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-700"
                                )}>
                                    <User className={cn("w-6 h-6", selectedConv?.id === conv.id ? "text-white" : "text-zinc-400")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="font-bold truncate text-xs uppercase tracking-wider">
                                            {conv.seller_id === currentUser?.id ? conv.collector?.full_name : conv.seller?.full_name}
                                        </h3>
                                        {conv.unreadCount ? (
                                            <span className="flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-black text-white bg-red-500 rounded-full px-1 shadow-lg border-2 border-white dark:border-zinc-900 group-hover:scale-110 transition-transform">
                                                {conv.unreadCount}
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className={cn(
                                        "text-[10px] font-medium truncate opacity-70",
                                        selectedConv?.id === conv.id ? "text-white" : "text-primary"
                                    )}>
                                        {conv.waste_types?.name} • {conv.estimated_weight}kg
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={cn(
                    "flex-1 flex flex-col bg-zinc-50/30 dark:bg-zinc-950 min-h-0",
                    !selectedConv && "hidden md:flex items-center justify-center p-12 text-center"
                )}>
                    {selectedConv ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 sm:p-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setSelectedConv(null)} className="md:hidden p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="font-black uppercase tracking-tight text-sm">{otherParty?.name}</h2>
                                        <div className="flex items-center gap-1.5 leading-none">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                onlineUsers.has(otherParty?.id || '') ? "bg-green-500 animate-pulse" : "bg-zinc-300"
                                            )} />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                                {onlineUsers.has(otherParty?.id || '') ? "En ligne" : "Hors ligne"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-[10px] font-extrabold uppercase tracking-tighter">
                                    <Package className="w-3.5 h-3.5 text-primary" />
                                    <span>Lot #{selectedConv.id.split('-')[0]}</span>
                                </div>
                            </div>

                            {/* Message List */}
                            <div 
                                ref={scrollRef}
                                onScroll={handleScroll}
                                className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:p-8 space-y-2 scroll-smooth hide-scrollbar"
                            >
                                <AnimatePresence initial={false}>
                                    {messages.map((msg, idx) => (
                                        <Bubble 
                                            key={msg.id} 
                                            msg={msg} 
                                            isMe={msg.sender_id === currentUser?.id}
                                            isLast={idx === messages.length - 1 || messages[idx+1].sender_id !== msg.sender_id}
                                        />
                                    ))}
                                </AnimatePresence>
                                <div ref={messagesEndRef} className="h-4" />
                            </div>

                            {/* Input Area */}
                            <div className="relative p-4 sm:p-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
                                
                                {/* New Message Badge */}
                                <AnimatePresence>
                                    {showScrollBottom && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            onClick={scrollToBottom}
                                            className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary text-white rounded-full shadow-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 z-50 hover:scale-105 active:scale-95 transition-transform"
                                        >
                                            Nouveau message <ChevronDown className="w-3 h-3" />
                                        </motion.button>
                                    )}
                                </AnimatePresence>

                                {isTyping && (
                                    <div className="absolute -top-6 left-6 text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2 animate-pulse">
                                        <div className="flex gap-0.5">
                                            <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        {otherParty?.name} écrit...
                                    </div>
                                )}

                                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                                    <div className="flex-1 relative group">
                                        <input 
                                            type="text" 
                                            value={newMessage} 
                                            onChange={handleTyping}
                                            placeholder="Écrivez votre message..." 
                                            className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none text-sm font-medium transition-all" 
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={!newMessage.trim()}
                                        className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90",
                                            newMessage.trim() 
                                                ? "bg-primary text-white shadow-primary/20 hover:rotate-12" 
                                                : "bg-zinc-50 text-zinc-300 dark:bg-zinc-800 dark:text-zinc-700 cursor-not-allowed"
                                        )}
                                    >
                                        <Send className="w-6 h-6" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center max-w-sm">
                            <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mb-8">
                                <MessageSquare className="w-10 h-10 text-primary opacity-20" />
                            </div>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-3">Discussions</h2>
                            <p className="text-xs text-zinc-500 font-medium">Sélectionnez un lot pour finaliser la collecte.</p>
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
            </div>
        }>
            <ChatContainer />
        </Suspense>
    );
}
