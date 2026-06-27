import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get("classId")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const studentId = searchParams.get("studentId")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  if (classId) {
    where.session = { ...where.session, classId }
  }

  if (dateFrom || dateTo) {
    where.checkedAt = {}
    if (dateFrom) {
      where.checkedAt.gte = new Date(dateFrom)
    }
    if (dateTo) {
      where.checkedAt.lte = new Date(dateTo)
    }
  }

  if (studentId) {
    where.user = { studentId }
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          studentId: true,
          email: true,
        },
      },
      session: {
        select: {
          id: true,
          startedAt: true,
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { checkedAt: "desc" },
  })

  return NextResponse.json(
    records.map((r) => ({
      id: r.id,
      userId: r.user.id,
      userName: r.user.name,
      studentId: r.user.studentId,
      email: r.user.email,
      sessionId: r.session.id,
      sessionStartedAt: r.session.startedAt,
      classId: r.session.class.id,
      className: r.session.class.name,
      status: r.status,
      checkedAt: r.checkedAt,
    }))
  )
}
