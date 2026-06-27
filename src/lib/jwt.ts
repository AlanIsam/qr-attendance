import jwt from "jsonwebtoken"

// Pure JWT/cookie helpers with NO database dependency. Keeping these separate
// from auth.ts means the proxy (middleware) can verify tokens without pulling
// Prisma / the native libsql adapter into the middleware bundle.

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret && secret.length > 0) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable must be set in production")
  }
  return "dev-only-insecure-secret"
}

// Cookie options shared by login/register/logout so the auth cookie is
// hardened consistently. `secure` is production-only so local HTTP dev works.
export const AUTH_COOKIE_NAME = "auth-token"
export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
}

export function signToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" })
}

export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: string; role: string }
  } catch {
    return null
  }
}
