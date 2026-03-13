"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
    variant?: "rect" | "circle" | "text";
}

export function Skeleton({ className, variant = "rect" }: SkeletonProps) {
    return (
        <div 
            className={cn(
                "animate-pulse bg-gray-200 dark:bg-zinc-800",
                variant === "circle" ? "rounded-full" : "rounded-2xl",
                "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
                className
            )}
        />
    );
}

export function MarketplaceSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-zinc-800 p-8 space-y-6">
                    <Skeleton className="aspect-[16/10] w-full" />
                    <div className="flex justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-2 w-16" />
                            <Skeleton className="h-8 w-24" />
                        </div>
                        <Skeleton className="h-10 w-24" />
                    </div>
                    <Skeleton className="h-12 w-full" />
                </div>
            ))}
        </div>
    );
}
