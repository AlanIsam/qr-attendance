import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser, hashPassword } from "@/lib/auth"

export async function GET(request: Request) {
  const user = await getAuthUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const role = searchParams.get("role")

  const users = await prisma.user.findMany({
    where: role ? { role } : undefined,
    select: {
      id: true,
      email: true,
      name: true,
      studentId: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, email, password } = await request.json()

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 }
    )
  }

  const passwordHash = await hashPassword(password)
  const newAdmin = await prisma.user.create({
    data: { name, email, passwordHash, role: "admin" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  return NextResponse.json({ user: newAdmin }, { status: 201 })
}
