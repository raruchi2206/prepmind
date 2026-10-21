const app = require("./app");
const { env } = require("./config/env");
const { connectDatabase, disconnectDatabase, isDatabaseConnected } = require("./config/db");

async function start() {
  const aiServiceUrl =
    process.env.AI_SERVICE_URL ||
    require("./config/env").env.AI_SERVICE_URL ||
    "http://127.0.0.1:8000";

  // Attempt database connection without fatally crashing Express
  const dbConnected = await connectDatabase();
  if (!dbConnected) {
    console.warn("⚠️  [WARNING] Server starting with MongoDB DISCONNECTED. API routes requiring database will fail until connection is restored.");
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 PrepMind API listening on http://localhost:${env.PORT}`);
    console.log(`[AI SERVICE] URL configured: ${aiServiceUrl}`);
    console.log(`[DB STATUS] MongoDB: ${isDatabaseConnected() ? "CONNECTED" : "UNAVAILABLE"}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});

