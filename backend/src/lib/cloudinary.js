import { v2 as cloudinary } from "cloudinary";

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("🚀 Cloudinary media uploader configured successfully.");
} else {
  console.log("⚠️ Cloudinary credentials missing. Falling back to secure local static file uploads.");
}

/**
 * 🚀 High-performance direct upload of in-memory Buffer to Cloudinary
 */
export const uploadToCloudinary = (fileBuffer, folder = "converse") => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured) {
      return reject(new Error("Cloudinary is not configured"));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, format: "webp" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload stream failure:", error);
          return reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export { isCloudinaryConfigured };
