"use client";

import { useState, useEffect } from "react";
import { Bell, Package, CreditCard, User, Info, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

export default function NotificationsPage() {
    const supabase = createClient();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Mark ALL notifications as read immediately when opening the notifications page
                supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('profile_id', user.id)
                    .eq('is_read', false)
                    .then(() => console.log("All notifications marked as read"));

                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('profile_id', user.id)
                    .order('created_at', { ascending: false });
                
                // Optimistically map over them locally so they are visually empty / read
                setNotifications(data?.map(n => ({ ...n, is_read: true })) || []);
            }
            setLoading(false);
        };
        fetchNotifications();
    }, [supabase]);

    const markAsRead = async (id: number) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
    };

    const deleteNotification = async (id: number) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (!error) {
            setNotifications(notifications.filter(n => n.id !== id));
            showToast("Notification supprimée", "success");
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'offer': return <Package className="w-5 h-5 text-blue-500" />;
            case 'payment': return <CreditCard className="w-5 h-5 text-green-500" />;
            case 'collection': return <CheckCircle2 className="w-5 h-5 text-amber-500" />;
            default: return <Info className="w-5 h-5 text-gray-500" />;
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Lecture de vos alertes...</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4 py-10">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-4 mb-2 tracking-tighter uppercase italic">
                        <Bell className="w-10 h-10 text-primary" />
                        Alertes
                    </h1>
                    <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest pl-14">
                        Tenez-vous informé de votre activité CITICLINE
                    </p>
                </div>
                {notifications.some(n => !n.is_read) && (
                    <span className="bg-primary/10 text-primary text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-primary/20">
                        Nouveaux messages
                    </span>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-zinc-800">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bell className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-2">Tout est calme</h3>
                    <p className="text-xs text-gray-400 font-bold">Vous n'avez aucune notification pour le moment.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            onClick={() => !n.is_read && markAsRead(n.id)}
                            className={cn(
                                "group relative flex items-start gap-6 p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer",
                                n.is_read
                                    ? "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
                                    : "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5"
                            )}
                        >
                            <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                                n.is_read ? "bg-gray-50 dark:bg-zinc-800" : "bg-white dark:bg-zinc-900"
                            )}>
                                {getIcon(n.type)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className={cn(
                                        "text-xs font-black uppercase tracking-widest truncate",
                                        n.is_read ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-white"
                                    )}>
                                        {n.title}
                                    </h3>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
                                        {new Date(n.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className={cn(
                                    "text-xs leading-relaxed font-bold",
                                    n.is_read ? "text-gray-400" : "text-gray-700 dark:text-gray-300"
                                )}>
                                    {n.content}
                                </p>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(n.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
