import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10)

  await prisma.user.upsert({
    where: { email: "admin@attendance.com" },
    update: {},
    create: {
      email: "admin@attendance.com",
      name: "Admin",
      passwordHash,
      role: "admin",
    },
  })

  await prisma.settings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      lateThreshold: 10,
      qrRefreshInterval: 30,
      sessionDuration: 120,
    },
  })

  console.log("Seed complete: admin@attendance.com / admin123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
