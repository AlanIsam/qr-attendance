import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { generateQRToken } from "@/lib/qr"

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

  const sessions = await prisma.attendanceSession.findMany({
    where: classId ? { classId } : undefined,
    include: {
      class: { select: { id: true, name: true, code: true } },
      _count: { select: { records: true } },
    },
    orderBy: { startedAt: "desc" },
  })

  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      classId: s.classId,
      className: s.class.name,
      classCode: s.class.code,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      lateThreshold: s.lateThreshold,
      checkInCount: s._count.records,
    }))
  )
}

export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { classId } = body

  if (!classId) {
    return NextResponse.json({ error: "classId is required" }, { status: 400 })
  }

  const classExists = await prisma.class.findUnique({ where: { id: classId } })
  if (!classExists) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 })
  }

  const settings = await prisma.settings.findFirst()
  const lateThreshold = settings?.lateThreshold ?? 15
  const qrRefreshInterval = settings?.qrRefreshInterval ?? 30

  const qr = generateQRToken("placeholder", qrRefreshInterval)

  const session = await prisma.attendanceSession.create({
    data: {
      classId,
      createdById: user.id,
      lateThreshold,
      currentToken: qr.token,
      tokenExpiresAt: new Date(qr.expiresAt),
    },
    include: {
      class: { select: { name: true } },
    },
  })

  // Re-generate with real session ID
  const finalQr = generateQRToken(session.id, qrRefreshInterval)
  await prisma.attendanceSession.update({
    where: { id: session.id },
    data: {
      currentToken: finalQr.token,
      tokenExpiresAt: new Date(finalQr.expiresAt),
    },
  })

  return NextResponse.json(
    {
      id: session.id,
      classId: session.classId,
      className: session.class.name,
      startedAt: session.startedAt,
      lateThreshold: session.lateThreshold,
      token: finalQr.token,
      tokenExpiresAt: finalQr.expiresAt,
    },
    { status: 201 }
  )
}
