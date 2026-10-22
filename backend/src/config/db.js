const mongoose = require("mongoose");
const { env } = require("./env");

const RETRY_DELAY_MS = 10000;
let retryTimer = null;

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

async function connectDatabase() {
  mongoose.connection.on("connected", () => {
    console.log("✅ MongoDB connected successfully to database:", mongoose.connection.name);
  });

  mongoose.connection.on("error", (error) => {
    console.error("❌ MongoDB runtime error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected");
  });

  return attemptConnection();
}

// Mongoose only retries after a successful first connection, so a failed startup
// attempt is retried here until the database becomes reachable.
async function attemptConnection() {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: "prepmind",
      serverSelectionTimeoutMS: 15000,
    });
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:");
    console.error(`   - Summary : ${error.message}`);
    if (error.cause && error.cause.setName) {
      console.error(`   - ReplicaSet : ${error.cause.setName}`);
    }
    scheduleRetry();
    return false;
  }
}

function scheduleRetry() {
  if (retryTimer) return;
  console.warn(`   - Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000}s...`);
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    if (mongoose.connection.readyState === 0) {
      await attemptConnection();
    }
  }, RETRY_DELAY_MS);
  retryTimer.unref();
}

async function disconnectDatabase() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = { connectDatabase, disconnectDatabase, isDatabaseConnected };

