import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { classCode } = body

  if (!classCode || typeof classCode !== "string") {
    return NextResponse.json(
      { error: "Class code is required" },
      { status: 400 }
    )
  }

  // Find the class by code
  const classData = await prisma.class.findUnique({
    where: { code: classCode },
  })

  if (!classData) {
    return NextResponse.json(
      { error: "Class not found. Please check the class code." },
      { status: 404 }
    )
  }

  // Check if student is already enrolled
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_classId: {
        userId: user.id,
        classId: classData.id,
      },
    },
  })

  if (existingEnrollment) {
    return NextResponse.json(
      { error: "You are already enrolled in this class" },
      { status: 409 }
    )
  }

  // Create enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      userId: user.id,
      classId: classData.id,
      status: "approved",
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          schedule: true,
        },
      },
    },
  })

  return NextResponse.json(enrollment, { status: 201 })
}
