const mongoose = require("mongoose");
const { env } = require("./env");

async function connectDatabase() {
  mongoose.connection.on("connected", () => console.log("MongoDB connected"));
  mongoose.connection.on("error", (error) =>
    console.error("MongoDB error:", error.message),
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("MongoDB disconnected"),
  );

  await mongoose.connect(env.MONGODB_URI, { dbName: "prepmind" });
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
