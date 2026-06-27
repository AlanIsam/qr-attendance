import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { prisma } from "./db"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
  } catch {
    return null
  }
}

export async function getAuthUser(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cookieHeader = request.headers.get("cookie")

  let token: string | undefined

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7)
  } else if (cookieHeader) {
    const match = cookieHeader.match(/auth-token=([^;]+)/)
    token = match?.[1]
  }

  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded) return null

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      name: true,
      studentId: true,
      role: true,
      createdAt: true,
    },
  })

  return user
}
