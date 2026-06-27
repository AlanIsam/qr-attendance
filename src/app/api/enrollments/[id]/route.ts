import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function PATCH(
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
  const { status } = body

  if (!status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "Status must be 'approved' or 'rejected'" },
      { status: 400 }
    )
  }

  const enrollment = await prisma.enrollment.findUnique({ where: { id } })
  if (!enrollment) {
    return NextResponse.json(
      { error: "Enrollment not found" },
      { status: 404 }
    )
  }

  const updated = await prisma.enrollment.update({
    where: { id },
    data: { status },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
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

  const { id } = await params

  const enrollment = await prisma.enrollment.findUnique({ where: { id } })
  if (!enrollment) {
    return NextResponse.json(
      { error: "Enrollment not found" },
      { status: 404 }
    )
  }

  // Allow admin or the enrolled student to delete
  if (user.role !== "admin" && user.id !== enrollment.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.enrollment.delete({ where: { id } })

  return NextResponse.json({ message: "Enrollment removed successfully" })
}
