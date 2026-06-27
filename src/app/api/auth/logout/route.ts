import { NextResponse } from "next/server"
import { AUTH_COOKIE_NAME } from "@/lib/auth"

// Clears the auth cookie server-side. The cookie is httpOnly, so the client
// cannot delete it on its own — this endpoint is required for a real logout.
export async function POST() {
  const response = NextResponse.json({ message: "Logged out" })
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return response
}
