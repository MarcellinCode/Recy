"use client";

import { useState } from "react";
import { Star, Loader2, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { showToast } from "@/components/ui/toast";

interface RatingModalProps {
    wasteId: string;
    revieweeId: string;
    reviewerId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function RatingModal({ wasteId, revieweeId, reviewerId, onClose, onSuccess }: RatingModalProps) {
    const supabase = createClient();
    const [rating, setRating] = useState(5);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        const { error } = await supabase.from('reviews').insert({
            waste_id: wasteId,
            reviewer_id: reviewerId,
            reviewee_id: revieweeId,
            rating,
            comment
        });

        if (error) {
            showToast("Erreur lors de l'envoi de la note", "error");
        } else {
            showToast("Merci pour votre avis !", "success");
            onSuccess();
            onClose();
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border border-gray-100 dark:border-zinc-800 shadow-2xl relative animate-in fade-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-8 right-8 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <Star className="w-10 h-10 text-primary fill-primary" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic mb-2">Votre avis compte</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Évaluez votre expérience pour aider la communauté.</p>
                </div>

                <div className="flex justify-center gap-2 mb-10">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(0)}
                            onClick={() => setRating(star)}
                            className="p-1 transition-transform hover:scale-125 active:scale-95"
                        >
                            <Star
                                className={cn(
                                    "w-10 h-10 transition-colors",
                                    (hover || rating) >= star ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-800"
                                )}
                            />
                        </button>
                    ))}
                </div>

                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Commentaire (optionnel)</span>
                    </div>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Qu'est-ce qui s'est bien passé ?"
                        className="w-full p-6 bg-gray-50 dark:bg-zinc-800 border-none rounded-3xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold resize-none h-32"
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-6 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-70"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer mon avis"}
                </button>
            </div>
        </div>
    );
}
