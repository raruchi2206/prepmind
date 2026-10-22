const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  COOKIE_DOMAIN: z.string().optional(),
  EMAIL_HOST: z.string().default("smtp.gmail.com"),
  EMAIL_PORT: z.coerce.number().int().positive().default(587),
  EMAIL_USER: z.string().email().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default("PrepMind <raruchi2206@gmail.com>"),
  OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().default(10),
  AI_SERVICE_URL: z.string().default("http://127.0.0.1:8000"),
  AI_PRIMARY_PROVIDER: z.string().default("groq"),
  AI_FALLBACK_PROVIDER: z.string().default("ollama"),
  GROQ_API_KEY: z
    .string()
    .transform((val) => (val ? val.trim() : val))
    .optional(),
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  OLLAMA_LLM_MODEL: z.string().default("qwen2.5vl:3b"),
  EMBEDDING_PROVIDER: z.string().default("ollama"),
  OLLAMA_EMBEDDING_MODEL: z.string().default("all-minilm:latest"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

if (
  parsed.data.JWT_ACCESS_SECRET.includes("your_long_random_secret") ||
  parsed.data.JWT_REFRESH_SECRET.includes("your_long_random_secret")
) {
  throw new Error(
    "JWT secrets must be replaced with long random values before starting the backend.",
  );
}

module.exports = { env: parsed.data };
