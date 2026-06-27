import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { generateQRToken } from "@/lib/qr"

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

  if (session.endedAt) {
    return NextResponse.json({ error: "Session has ended" }, { status: 400 })
  }

  const settings = await prisma.settings.findFirst()
  const qrRefreshInterval = settings?.qrRefreshInterval ?? 30

  const now = Date.now()
  const tokenExpired =
    !session.currentToken ||
    !session.tokenExpiresAt ||
    session.tokenExpiresAt.getTime() < now

  if (tokenExpired) {
    const qr = generateQRToken(id, qrRefreshInterval)

    await prisma.attendanceSession.update({
      where: { id },
      data: {
        currentToken: qr.token,
        tokenExpiresAt: new Date(qr.expiresAt),
      },
    })

    return NextResponse.json({
      token: qr.token,
      sessionId: id,
      expiresAt: qr.expiresAt,
      refreshInterval: qrRefreshInterval,
    })
  }

  return NextResponse.json({
    token: session.currentToken,
    sessionId: id,
    expiresAt: session.tokenExpiresAt!.getTime(),
    refreshInterval: qrRefreshInterval,
  })
}
