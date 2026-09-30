const app = require("./app");
const { env } = require("./config/env");
const { connectDatabase, disconnectDatabase } = require("./config/db");

async function start() {
  await connectDatabase();
  const server = app.listen(env.PORT, () =>
    console.log(`PrepMind API listening on http://localhost:${env.PORT}`),
  );
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
  console.error("Unable to start PrepMind API:", error.message);
  process.exit(1);
});
