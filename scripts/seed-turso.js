const { createClient } = require("@libsql/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv/config");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  const now = new Date().toISOString();
  const id = "admin_" + crypto.randomBytes(8).toString("hex");

  await client.execute({
    sql: 'INSERT INTO "User" (id, email, name, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, "admin@attendance.com", "Admin", hash, "admin", now, now],
  });
  console.log("Admin user created");

  await client.execute({
    sql: 'INSERT INTO "Settings" (id, lateThreshold, qrRefreshInterval, sessionDuration) VALUES (?, ?, ?, ?)',
    args: ["global", 10, 30, 120],
  });
  console.log("Settings created");
  console.log("Seed complete: admin@attendance.com / admin123");
}

main().catch(console.error);
