import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { classId } = await params

  // Verify the class exists
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, name: true },
  })

  if (!classData) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 })
  }

  // Verify the student is enrolled in this class
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_classId: {
        userId: user.id,
        classId,
      },
    },
  })

  if (!enrollment) {
    return NextResponse.json(
      { error: "You are not enrolled in this class" },
      { status: 403 }
    )
  }

  // Get attendance records for this student in this class
  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId: user.id,
      session: { classId },
    },
    include: {
      session: {
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
        },
      },
    },
    orderBy: { checkedAt: "desc" },
  })

  return NextResponse.json({
    class: classData,
    history: records.map((r) => ({
      id: r.id,
      sessionId: r.session.id,
      sessionDate: r.session.startedAt,
      sessionEndedAt: r.session.endedAt,
      checkInTime: r.checkedAt,
      status: r.status,
    })),
  })
}
