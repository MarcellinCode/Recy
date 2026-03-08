"use server";

import { v2 as cloudinary } from "cloudinary";

export async function uploadImage(file: string) {
    // Highly reliable configuration using the URL
    cloudinary.config({
        cloudinary_url: process.env.CLOUDINARY_URL,
        secure: true
    });

    console.log("Cloudinary Config Check (URL):", {
        has_url: !!process.env.CLOUDINARY_URL
    });

    try {
        const uploadResponse = await cloudinary.uploader.upload(file, {
            folder: "recy-wastes",
        });
        return { url: uploadResponse.secure_url };
    } catch (error: any) {
        console.error("Cloudinary upload error full details:", error);
        throw new Error(`Cloudinary Error: ${error.message || "Unknown error"}`);
    }
}
