import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Thiếu tham số start/end" }, { status: 400 });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        hotelId: session.user.hotelId,
        checkInDate: { lte: new Date(end) },
        checkOutDate: { gte: new Date(start) },
        status: { not: "CANCELLED" }
      },
      include: {
        guest: { select: { fullName: true } },
        room: { select: { roomNumber: true } }
      }
    });

    const events = bookings.map(b => ({
      id: b.id,
      title: `${b.room.roomNumber} - ${b.guest.fullName}`,
      start: b.checkInDate,
      end: b.checkOutDate,
      extendedProps: {
        status: b.status,
        bookingCode: b.bookingCode
      }
    }));

    return NextResponse.json({ data: events });
  } catch (error) {
    console.error("GET /api/calendar error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
