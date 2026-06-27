import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let settings = await prisma.settings.findFirst()

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        lateThreshold: 15,
        qrRefreshInterval: 30,
        sessionDuration: 90,
      },
    })
  }

  return NextResponse.json({
    id: settings.id,
    lateThreshold: settings.lateThreshold,
    qrRefreshInterval: settings.qrRefreshInterval,
    sessionDuration: settings.sessionDuration,
  })
}

export async function PUT(request: Request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { lateThreshold, qrRefreshInterval, sessionDuration } = body

  let settings = await prisma.settings.findFirst()

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        lateThreshold: lateThreshold ?? 15,
        qrRefreshInterval: qrRefreshInterval ?? 30,
        sessionDuration: sessionDuration ?? 90,
      },
    })
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    if (lateThreshold !== undefined) updateData.lateThreshold = lateThreshold
    if (qrRefreshInterval !== undefined)
      updateData.qrRefreshInterval = qrRefreshInterval
    if (sessionDuration !== undefined)
      updateData.sessionDuration = sessionDuration

    settings = await prisma.settings.update({
      where: { id: settings.id },
      data: updateData,
    })
  }

  return NextResponse.json({
    id: settings.id,
    lateThreshold: settings.lateThreshold,
    qrRefreshInterval: settings.qrRefreshInterval,
    sessionDuration: settings.sessionDuration,
  })
}
