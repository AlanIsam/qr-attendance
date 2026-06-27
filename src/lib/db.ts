import path from "path"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const url = process.env.TURSO_DATABASE_URL
  if (url && url.startsWith("libsql://")) {
    const adapter = new PrismaLibSql({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    return new PrismaClient({ adapter })
  }

  const dbPath = path.join(process.cwd(), "prisma", "dev.db")
  return new PrismaClient({
    datasourceUrl: `file:${dbPath}`,
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
