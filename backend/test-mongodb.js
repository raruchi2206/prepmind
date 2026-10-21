/**
 * Independent MongoDB Connection Tester for PrepMind
 * This script diagnoses DNS, network, authentication, and connection string format issues
 * WITHOUT exposing any passwords or confidential credentials.
 */

const dns = require("dns").promises;
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function runDiagnostic() {
  console.log("==========================================");
  console.log("   PrepMind MongoDB Diagnostic Tool       ");
  console.log("==========================================\n");

  const uri = process.env.MONGODB_URI;

  // 1. Environment Variable Check
  if (!uri) {
    console.error("❌ ERROR: MONGODB_URI is not defined in your .env file.");
    process.exit(1);
  }

  console.log("1. Environment Variable Check:");
  console.log("   ✓ MONGODB_URI found in .env");

  // 2. Safe URI Parsing & Format Check
  let parsedProtocol = "";
  let hostPart = "";
  let hasUser = false;
  let hasPass = false;
  let unencodedCharsFound = [];

  if (uri.startsWith("mongodb+srv://")) {
    parsedProtocol = "mongodb+srv";
  } else if (uri.startsWith("mongodb://")) {
    parsedProtocol = "mongodb";
  } else {
    console.error("   ❌ Invalid URI format: URI must start with mongodb:// or mongodb+srv://");
    process.exit(1);
  }

  console.log(`   ✓ Protocol: ${parsedProtocol}://`);

  try {
    // Check credentials presence without printing them
    const withoutProtocol = uri.replace(/^mongodb(\+srv)?:\/\//, "");
    const atIndex = withoutProtocol.indexOf("@");
    if (atIndex !== -1) {
      const authPart = withoutProtocol.substring(0, atIndex);
      const hostAndOptions = withoutProtocol.substring(atIndex + 1);
      hostPart = hostAndOptions.split("/")[0].split("?")[0];

      const colonIndex = authPart.indexOf(":");
      if (colonIndex !== -1) {
        hasUser = colonIndex > 0;
        hasPass = colonIndex < authPart.length - 1;
        const rawPass = authPart.substring(colonIndex + 1);

        // Check for common forbidden unencoded chars in URI password
        const forbiddenChars = [":", "/", "?", "#", "[", "]", "@", "%"];
        for (const char of forbiddenChars) {
          if (rawPass.includes(char) && !rawPass.includes("%")) {
            unencodedCharsFound.push(char);
          }
        }
      }
    } else {
      hostPart = withoutProtocol.split("/")[0].split("?")[0];
    }
  } catch (parseErr) {
    console.warn("   ⚠️ Warning: Could not parse connection string format:", parseErr.message);
  }

  console.log(`   ✓ User provided: ${hasUser ? "Yes" : "No"}`);
  console.log(`   ✓ Password provided: ${hasPass ? "Yes" : "No"}`);
  console.log(`   ✓ Cluster Host: ${hostPart || "Unknown"}`);

  if (unencodedCharsFound.length > 0) {
    console.warn(`   ⚠️ WARNING: Your password appears to contain special characters (${unencodedCharsFound.join(" ")}) that may need URL-encoding (e.g. encodeURIComponent).`);
  }

  // 3. DNS SRV Resolution Check (for Atlas mongodb+srv)
  if (parsedProtocol === "mongodb+srv" && hostPart) {
    console.log("\n2. DNS Resolution Check (SRV Record):");
    const srvRecord = `_mongodb._tcp.${hostPart}`;
    try {
      console.log(`   Looking up SRV: ${srvRecord}...`);
      const records = await dns.resolveSrv(srvRecord);
      console.log(`   ✓ DNS SRV Resolution SUCCESS! Found ${records.length} cluster node(s):`);
      records.forEach((rec, i) => {
        console.log(`     - Node ${i + 1}: ${rec.name}:${rec.port} (priority: ${rec.priority}, weight: ${rec.weight})`);
      });
    } catch (dnsErr) {
      console.error(`   ❌ DNS SRV Resolution FAILED: ${dnsErr.code || dnsErr.message}`);
      console.error("   ➡️ ROOT CAUSE IDENTIFIED: Your local DNS / ISP is failing to resolve MongoDB Atlas SRV records.");
      console.error("      This is common with certain Windows network adapters, routers, or ISPs.");
      console.error("      Solution: Switch Windows DNS to 8.8.8.8 / 1.1.1.1 or use standard direct replicaSet connection string.\n");
    }
  }

  // 4. Actual Node.js Driver / Mongoose Connection Test
  console.log("\n3. Mongoose Connection Attempt:");
  console.log("   Connecting (timeout: 6000ms)...");

  try {
    const startTime = Date.now();
    await mongoose.connect(uri, {
      dbName: "prepmind",
      serverSelectionTimeoutMS: 6000,
    });
    const duration = Date.now() - startTime;
    console.log(`   ✅ SUCCESS: Successfully connected to MongoDB in ${duration}ms!`);
    console.log(`   Database name: ${mongoose.connection.name}`);
    console.log(`   Connection state: ${mongoose.connection.readyState === 1 ? "Connected (1)" : mongoose.connection.readyState}`);

    await mongoose.disconnect();
    console.log("   Cleanly disconnected.");
    console.log("\n==========================================");
    console.log("   RESULT: MongoDB Atlas is working!      ");
    console.log("==========================================");
    process.exit(0);
  } catch (connErr) {
    console.error("\n❌ CONNECTION FAILED!");
    console.error("--- Detailed Error Information ---");
    console.error(`Error Name    : ${connErr.name}`);
    console.error(`Error Code    : ${connErr.code || "N/A"}`);
    console.error(`Error Message : ${connErr.message}`);

    if (connErr.cause) {
      console.error(`Error Cause   :`, connErr.cause);
    }
    if (connErr.reason && connErr.reason.servers) {
      console.error("Server States :");
      for (const [server, desc] of connErr.reason.servers.entries()) {
        console.error(`  - ${server}: ${desc.error ? desc.error.message : desc.type}`);
      }
    }

    console.error("----------------------------------\n");
    process.exit(1);
  }
}

runDiagnostic();
