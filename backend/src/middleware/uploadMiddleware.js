const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { createHttpError } = require("./errorMiddleware");

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".pptx", ".docx", ".txt"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.user || !req.user._id) {
      return cb(createHttpError(401, "Authentication required for upload"));
    }
    const userId = req.user._id.toString();
    const uploadDir = path.join(__dirname, "../../storage/uploads", userId);
    
    // Ensure directory exists with recursive: true
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = crypto.randomBytes(16).toString("hex");
    cb(null, `${safeBaseName}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      createHttpError(
        400,
        `Unsupported file extension "${ext}". Allowed types: PDF, PPTX, DOCX, TXT.`,
      ),
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype) && file.mimetype !== "application/octet-stream") {
    return cb(
      createHttpError(
        400,
        `Unsupported MIME type "${file.mimetype}". Allowed types: PDF, PPTX, DOCX, TXT.`,
      ),
    );
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});

module.exports = { upload };
