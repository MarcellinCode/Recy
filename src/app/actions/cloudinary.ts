"use server";

import { v2 as cloudinary } from "cloudinary";
import { requireRole } from "@/lib/auth-guards";

const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo

export async function uploadImage(file: string): Promise<{ url?: string; error?: string; success: boolean }> {
    // 🛡️ Seuls les utilisateurs connectés peuvent envoyer des images
    const guard = await requireRole();
    if (!guard.ok) return { success: false, error: guard.error };

    if (typeof file !== "string" || !/^data:image\/(png|jpe?g|webp|heic|heif);base64,/i.test(file)) {
        return { success: false, error: "Format d'image non supporté (PNG, JPG, WEBP)." };
    }
    // Taille approximative du binaire encodé en base64
    if (Math.floor((file.length * 3) / 4) > MAX_BYTES) {
        return { success: false, error: "Image trop lourde (8 Mo maximum)." };
    }

    if (!process.env.CLOUDINARY_URL) {
        console.error("Cloudinary Configuration Error: CLOUDINARY_URL is missing");
        return { success: false, error: "Configuration Cloudinary manquante (CLOUDINARY_URL)" };
    }

    cloudinary.config({
        cloudinary_url: process.env.CLOUDINARY_URL,
        secure: true
    });

    try {
        const uploadResponse = await cloudinary.uploader.upload(file, {
            folder: `CleanZone-wastes/${guard.user.id}`,
            resource_type: "image",
        });
        return { success: true, url: uploadResponse.secure_url };
    } catch (error: unknown) {
        console.error("Cloudinary upload error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erreur inconnue lors de l'envoi de l'image"
        };
    }
}
