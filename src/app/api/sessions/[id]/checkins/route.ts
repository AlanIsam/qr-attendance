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

  const session = await prisma.attendanceSession.findUnique({ where: { id } })
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          studentId: true,
          email: true,
        },
      },
    },
    orderBy: { checkedAt: "desc" },
  })

  return NextResponse.json(
    records.map((r) => ({
      id: r.id,
      userId: r.user.id,
      name: r.user.name,
      studentId: r.user.studentId,
      email: r.user.email,
      status: r.status,
      checkedAt: r.checkedAt,
    }))
  )
}
