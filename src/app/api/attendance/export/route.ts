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
          name: true,
          studentId: true,
          email: true,
        },
      },
      session: {
        select: {
          startedAt: true,
          class: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { checkedAt: "desc" },
  })

  const csvHeader = "Student Name,Student ID,Email,Class,Date,Check-in Time,Status"
  const csvRows = records.map((r) => {
    const date = r.session.startedAt.toISOString().split("T")[0]
    const checkInTime = r.checkedAt.toISOString()
    return [
      escapeCsv(r.user.name),
      escapeCsv(r.user.studentId ?? ""),
      escapeCsv(r.user.email),
      escapeCsv(r.session.class.name),
      date,
      checkInTime,
      r.status,
    ].join(",")
  })

  const csv = [csvHeader, ...csvRows].join("\n")

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=attendance-export.csv",
    },
  })
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
