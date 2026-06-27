import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get all classes the student is enrolled in
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, status: "approved" },
    select: { classId: true },
  })

  const classIds = enrollments.map((e) => e.classId)
  const totalEnrolledClasses = classIds.length

  // Get total sessions across all enrolled classes
  const totalSessions = await prisma.attendanceSession.count({
    where: { classId: { in: classIds } },
  })

  // Get all attendance records for this student across enrolled classes
  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId: user.id,
      session: { classId: { in: classIds } },
    },
    select: { status: true },
  })

  const attendedCount = records.length
  const lateCount = records.filter((r) => r.status === "late").length
  const attendanceRate =
    totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0

  return NextResponse.json({
    stats: {
      totalClasses: totalEnrolledClasses,
      totalSessions,
      attendedCount,
      attendanceRate,
      lateCount,
    },
  })
}
