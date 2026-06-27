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

  const session = await prisma.attendanceSession.findUnique({
    where: { id },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: {
              enrollments: { where: { status: "approved" } },
            },
          },
        },
      },
      _count: { select: { records: true } },
    },
  })

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: session.id,
    classId: session.classId,
    className: session.class.name,
    classCode: session.class.code,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    lateThreshold: session.lateThreshold,
    checkInCount: session._count.records,
    totalEnrolled: session.class._count.enrollments,
  })
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

  const session = await prisma.attendanceSession.findUnique({ where: { id } })
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  if (session.endedAt) {
    return NextResponse.json(
      { error: "Session already ended" },
      { status: 400 }
    )
  }

  const updated = await prisma.attendanceSession.update({
    where: { id },
    data: { endedAt: new Date() },
  })

  return NextResponse.json({
    id: updated.id,
    endedAt: updated.endedAt,
    message: "Session ended successfully",
  })
}
