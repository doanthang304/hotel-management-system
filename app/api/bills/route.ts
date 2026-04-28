import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const bills = await prisma.bill.findMany({
      where: {
        booking: { hotelId: session.user.hotelId }
      },
      include: {
        booking: {
          include: {
            guest: true,
            room: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ data: bills });
  } catch (error) {
    console.error("GET /api/bills error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
