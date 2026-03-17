"use server";

import { v2 as cloudinary } from "cloudinary";

export async function uploadImage(file: string): Promise<{ url?: string; error?: string; success: boolean }> {
    // Highly reliable configuration using the URL
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
            folder: "CITICLINE-wastes",
        });
        return { success: true, url: uploadResponse.secure_url };
    } catch (error: unknown) {
        console.error("Cloudinary upload error full details:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Erreur inconnue lors de l'envoi de l'image" 
        };
    }
}
