import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const classData = await prisma.class.findUnique({
    where: { id },
    include: {
      _count: {
        select: { enrollments: true },
      },
      enrollments: {
        where: { status: "approved" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
            },
          },
        },
      },
    },
  })

  if (!classData) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: classData.id,
    name: classData.name,
    code: classData.code,
    description: classData.description,
    schedule: classData.schedule,
    createdAt: classData.createdAt,
    updatedAt: classData.updatedAt,
    enrollmentCount: classData._count.enrollments,
    students: classData.enrollments.map((e) => ({
      enrollmentId: e.id,
      ...e.user,
    })),
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { name, description, schedule } = body

  const existing = await prisma.class.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 })
  }

  const updated = await prisma.class.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(schedule !== undefined && { schedule }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.class.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 })
  }

  await prisma.class.delete({ where: { id } })

  return NextResponse.json({ message: "Class deleted successfully" })
}
