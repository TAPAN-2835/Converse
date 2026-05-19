import path from "path";
import fs from "fs";
import sharp from "sharp";
import crypto from "crypto";
import Attachment from "../models/Attachment.js";
import { uploadToCloudinary, isCloudinaryConfigured } from "../lib/cloudinary.js";

// Ensure local directories exist for production stability (fallback uploader)
const UPLOADS_DIR = path.resolve("uploads");
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, "thumbnails");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

/**
 * Handles secure multi-part image uploads, processes files in memory using sharp,
 * uploads them directly to cloud storage (Cloudinary) or falls back to secure local directories,
 * and persists metadata inside MongoDB.
 */
export async function uploadMedia(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided for upload" });
    }

    const userId = req.user.id;
    const originalName = req.file.originalname;
    const size = req.file.size;
    const mimeType = "image/webp"; // We compress and cast to webp for optimum performance

    // Generate secure randomized unique filename (mostly for fallback and indexing)
    const fileUUID = crypto.randomUUID();
    const filename = `${fileUUID}.webp`;

    // 1. Process and compress the main image in memory (WEBP conversion with quality 80)
    const mainImageBuffer = await sharp(req.file.buffer)
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // 2. Generate a highly compressed small thumbnail in memory (width 200px)
    const thumbnailBuffer = await sharp(req.file.buffer)
      .resize({ width: 200, height: 200, fit: "cover" })
      .webp({ quality: 60 })
      .toBuffer();

    let fileUrl = "";
    let thumbnailUrl = "";

    if (isCloudinaryConfigured) {
      // 🚀 Cloud-Native Upload Flow
      console.log(`Cloudinary is active. Dispatching direct in-memory uploads for user: ${userId}`);
      
      const mainUploadResult = await uploadToCloudinary(mainImageBuffer, "converse_uploads");
      const thumbUploadResult = await uploadToCloudinary(thumbnailBuffer, "converse_thumbnails");

      fileUrl = mainUploadResult.secure_url;
      thumbnailUrl = thumbUploadResult.secure_url;
    } else {
      // ⚠️ Static Local Fallback Flow
      console.log(`Cloudinary credentials missing. Writing processed media to local disk: ${filename}`);

      const filePath = path.join(UPLOADS_DIR, filename);
      const thumbnailPath = path.join(THUMBNAILS_DIR, filename);

      await fs.promises.writeFile(filePath, mainImageBuffer);
      await fs.promises.writeFile(thumbnailPath, thumbnailBuffer);

      // Compute local delivery URLs
      const serverUrl = `${req.protocol}://${req.get("host")}`;
      fileUrl = `${serverUrl}/uploads/${filename}`;
      thumbnailUrl = `${serverUrl}/uploads/thumbnails/${filename}`;
    }

    // 3. Persist media metadata in MongoDB
    const newAttachment = new Attachment({
      userId,
      filename,
      originalName,
      mimeType,
      size,
      url: fileUrl,
      thumbnailUrl,
    });
    await newAttachment.save();

    console.log(`Successfully uploaded & processed media file: ${filename} via ${isCloudinaryConfigured ? "Cloudinary" : "Local Disk"}`);

    // Return the response in the exact payload shape required by GetStream's SDK uploader
    res.status(200).json({
      file: fileUrl,
      thumbnail: thumbnailUrl,
      attachmentId: newAttachment._id,
    });
  } catch (error) {
    console.error("Error in uploadMedia controller:", error.message);
    res.status(500).json({ message: "Upload failed: " + error.message });
  }
}
