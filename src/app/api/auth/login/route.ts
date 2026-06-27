import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { verifyPassword, signToken, authCookieOptions, AUTH_COOKIE_NAME } from "@/lib/auth"
import { loginSchema, firstError } from "@/lib/validations"
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit"

// Allow up to 10 login attempts per email within 10 minutes.
const LOGIN_LIMIT = 10
const LOGIN_WINDOW_MS = 10 * 60 * 1000

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed) }, { status: 400 })
    }
    const { email, password } = parsed.data

    // Per-email brute-force protection (does not penalize shared networks).
    const rlKey = `login:${email}`
    const rl = consumeRateLimit(rlKey, LOGIN_LIMIT, LOGIN_WINDOW_MS)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${rl.retryAfter} seconds.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Successful login clears the attempt counter for this email.
    resetRateLimit(rlKey)

    const token = signToken({ userId: user.id, role: user.role })

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        studentId: user.studentId,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    })
    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions)

    return response
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
