import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { sessionId, userId } = body

  if (!sessionId || !userId) {
    return NextResponse.json(
      { error: "sessionId and userId are required" },
      { status: 400 }
    )
  }

  // Check session exists and not ended
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
  })

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  if (session.endedAt) {
    return NextResponse.json(
      { error: "Session has already ended" },
      { status: 400 }
    )
  }

  // Check student is enrolled
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      classId: session.classId,
      status: "approved",
    },
  })

  if (!enrollment) {
    return NextResponse.json(
      { error: "Student is not enrolled in this class" },
      { status: 400 }
    )
  }

  // Check not already checked in
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: "Student has already checked in for this session" },
      { status: 409 }
    )
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      sessionId,
      userId,
      status: "manual",
      checkedAt: new Date(),
    },
    include: {
      user: {
        select: { name: true, studentId: true },
      },
    },
  })

  return NextResponse.json(
    {
      id: record.id,
      userName: record.user.name,
      studentId: record.user.studentId,
      status: record.status,
      checkedAt: record.checkedAt,
    },
    { status: 201 }
  )
}
