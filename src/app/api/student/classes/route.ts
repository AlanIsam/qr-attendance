import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          schedule: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    classes: enrollments.map((e) => ({
      id: e.id,
      classId: e.classId,
      status: e.status,
      createdAt: e.createdAt,
      class: e.class,
    })),
  })
}
