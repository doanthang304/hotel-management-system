import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  try {
    const where: any = { hotelId: session.user.hotelId };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { idNumber: { contains: search } }
      ];
    }

    const guests = await prisma.guest.findMany({
      where,
      orderBy: { fullName: "asc" },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    });

    return NextResponse.json({ data: guests });
  } catch (error) {
    console.error("GET /api/guests error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
