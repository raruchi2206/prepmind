const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { env } = require("./config/env");
const { authLimiter } = require("./middleware/rateLimiters");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const knowledgeRoutes = require("./routes/knowledgeRoutes");
const ragRoutes = require("./routes/ragRoutes");
const aiRoutes = require("./routes/aiRoutes");
const historyRoutes = require("./routes/historyRoutes");
const progressRoutes = require("./routes/progressRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/errorMiddleware");

const app = express();

app.disable("x-powered-by");
const allowedOrigins = [
  env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8443",
  "http://127.0.0.1:8443",
  "http://localhost:5000",
  "http://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

const { isDatabaseConnected } = require("./config/db");

app.get("/api/health", (request, response) => {
  const dbOk = isDatabaseConnected();
  response.status(dbOk ? 200 : 503).json({
    success: true,
    data: {
      service: "prepmind-api",
      status: dbOk ? "ok" : "degraded",
      database: dbOk ? "connected" : "disconnected",
    },
  });
});

// Fail fast with a clear message instead of letting queries buffer and time out
app.use("/api", (request, response, next) => {
  if (isDatabaseConnected()) return next();
  response.status(503).json({
    success: false,
    code: "DATABASE_UNAVAILABLE",
    message: "PrepMind can't reach its database right now. Please try again in a few seconds.",
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
