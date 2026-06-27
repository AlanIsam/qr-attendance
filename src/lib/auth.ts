import bcrypt from "bcryptjs"
import { prisma } from "./db"
import { verifyToken } from "./jwt"

// Re-export the pure JWT/cookie helpers so existing imports from "@/lib/auth"
// keep working. The DB-backed helpers live here; JWT primitives live in jwt.ts.
export {
  signToken,
  verifyToken,
  AUTH_COOKIE_NAME,
  authCookieOptions,
} from "./jwt"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
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
