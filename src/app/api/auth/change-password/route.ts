import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser, verifyPassword, hashPassword } from "@/lib/auth"
import { changePasswordSchema, firstError } from "@/lib/validations"

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request)

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const parsed = changePasswordSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed) }, { status: 400 })
    }
    const { currentPassword, newPassword } = parsed.data

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const valid = await verifyPassword(currentPassword, dbUser.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      )
    }

    const passwordHash = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ message: "Password updated successfully" })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
