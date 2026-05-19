import multer from "multer";

// Limit uploads to 5MB max
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WEBP are supported."), false);
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
}).single("file"); // Stream Chat React uses 'file' payload field name
