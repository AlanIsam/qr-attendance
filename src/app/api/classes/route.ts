import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { generateClassCode } from "@/lib/utils"

export async function GET(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const classes = await prisma.class.findMany({
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      description: c.description,
      schedule: c.schedule,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      enrollmentCount: c._count.enrollments,
    })),
  })
}

export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { name, description, schedule } = body

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Class name is required" },
      { status: 400 }
    )
  }

  // Generate a unique class code, retrying on collision
  let code: string
  let attempts = 0
  const maxAttempts = 10

  while (true) {
    code = generateClassCode(name)
    const existing = await prisma.class.findUnique({ where: { code } })
    if (!existing) break
    attempts++
    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Failed to generate a unique class code. Please try again." },
        { status: 500 }
      )
    }
  }

  const newClass = await prisma.class.create({
    data: {
      name,
      code,
      description: description || null,
      schedule: schedule || null,
    },
  })

  return NextResponse.json(newClass, { status: 201 })
}
