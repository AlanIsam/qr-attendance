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
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const classData = await prisma.class.findUnique({ where: { id } })
  if (!classData) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 })
  }

  // Get all enrolled students for this class
  const enrollments = await prisma.enrollment.findMany({
    where: { classId: id, status: "approved" },
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
  })

  // Get total sessions for this class
  const totalSessions = await prisma.attendanceSession.count({
    where: { classId: id },
  })

  // Get attendance records for all enrolled students in this class
  const studentIds = enrollments.map((e) => e.user.id)

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      userId: { in: studentIds },
      session: { classId: id },
    },
    select: {
      userId: true,
      status: true,
    },
  })

  // Build a map of userId -> attendance stats
  const statsMap = new Map<
    string,
    { attended: number; late: number }
  >()

  for (const record of attendanceRecords) {
    const stats = statsMap.get(record.userId) || { attended: 0, late: 0 }
    stats.attended++
    if (record.status === "late") {
      stats.late++
    }
    statsMap.set(record.userId, stats)
  }

  const students = enrollments.map((e) => {
    const stats = statsMap.get(e.user.id) || { attended: 0, late: 0 }
    return {
      ...e.user,
      enrollmentId: e.id,
      totalSessions,
      attendedCount: stats.attended,
      lateCount: stats.late,
      attendancePercentage:
        totalSessions > 0
          ? Math.round((stats.attended / totalSessions) * 100)
          : 0,
    }
  })

  return NextResponse.json(students)
}
