import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tasks = await prisma.housekeepingTask.findMany({
      where: { hotelId: session.user.hotelId },
      include: {
        room: true,
        assignee: { select: { fullName: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error("GET /api/housekeeping error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
