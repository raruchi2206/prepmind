const mongoose = require("mongoose");
const { env } = require("./env");

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

  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: "prepmind",
      serverSelectionTimeoutMS: 5000,
    });
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed during startup:");
    console.error(`   - Summary : ${error.message}`);
    if (error.cause && error.cause.setName) {
      console.error(`   - ReplicaSet : ${error.cause.setName}`);
    }
    return false;
  }
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = { connectDatabase, disconnectDatabase, isDatabaseConnected };

