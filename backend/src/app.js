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
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (request, response) =>
  response.json({
    success: true,
    data: { service: "prepmind-api", status: "ok" },
  }),
);

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/knowledge", knowledgeRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
