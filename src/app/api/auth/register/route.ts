import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hashPassword, signToken, authCookieOptions, AUTH_COOKIE_NAME } from "@/lib/auth"
import { registerSchema, firstError } from "@/lib/validations"
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit"

// Generous per-IP cap: lets a whole class register from shared WiFi while
// still stopping scripted mass-registration abuse.
const REGISTER_LIMIT = 50
const REGISTER_WINDOW_MS = 10 * 60 * 1000

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rl = consumeRateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many registrations. Try again in ${rl.retryAfter} seconds.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      )
    }

    const parsed = registerSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed) }, { status: 400 })
    }
    const { name, email, password, studentId } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        studentId: studentId || null,
        // Role is always "student" — clients can never self-assign admin.
        role: "student",
      },
      select: {
        id: true,
        email: true,
        name: true,
        studentId: true,
        role: true,
        createdAt: true,
      },
    })

    const token = signToken({ userId: user.id, role: user.role })

    const response = NextResponse.json({ user, token }, { status: 201 })
    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions)

    return response
  } catch (err: unknown) {
    // Unique-constraint race (e.g. duplicate studentId) → friendly message.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Email or student ID already in use" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
