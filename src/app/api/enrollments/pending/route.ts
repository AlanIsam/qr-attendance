import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { status: "pending" },
    include: {
      user: { select: { name: true, email: true, studentId: true } },
      class: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ enrollments });
}
