import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { token, sessionId } = body

  if (!token || !sessionId) {
    return NextResponse.json(
      { error: "token and sessionId are required" },
      { status: 400 }
    )
  }

  // Step 1: Find session with matching token that hasn't ended
  const session = await prisma.attendanceSession.findFirst({
    where: {
      id: sessionId,
      currentToken: token,
      endedAt: null,
    },
    include: {
      class: { select: { id: true, name: true } },
    },
  })

  if (!session) {
    return NextResponse.json(
      { error: "Invalid or expired QR code" },
      { status: 400 }
    )
  }

  // Step 2: Check if token has expired
  const now = Date.now()
  if (!session.tokenExpiresAt || session.tokenExpiresAt.getTime() < now) {
    return NextResponse.json(
      { error: "QR code has expired, please scan the new one" },
      { status: 400 }
    )
  }

  // Step 3: Check student is enrolled in the class
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: user.id,
      classId: session.classId,
      status: "approved",
    },
  })

  if (!enrollment) {
    return NextResponse.json(
      { error: "You are not enrolled in this class" },
      { status: 403 }
    )
  }

  // Step 4: Determine status (present or late)
  const elapsedMs = now - session.startedAt.getTime()
  const lateThresholdMs = session.lateThreshold * 60 * 1000
  const status = elapsedMs > lateThresholdMs ? "late" : "present"

  // Step 5: Create attendance record (catch duplicate)
  try {
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        status,
        checkedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      className: session.class.name,
      status: record.status,
      checkedAt: record.checkedAt,
    })
  } catch (error: unknown) {
    // Prisma unique constraint violation
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You have already checked in for this session" },
        { status: 409 }
      )
    }
    throw error
  }
}
