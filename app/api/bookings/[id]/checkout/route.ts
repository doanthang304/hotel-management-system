import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const hotelId = session.user.hotelId;
    const booking = await prisma.booking.findUnique({
      where: { id: id, hotelId },
      include: { room: true, bill: true }
    });

    if (!booking) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    if (booking.status !== "CHECKED_IN") {
      return NextResponse.json({ error: "Booking không ở trạng thái đang ở" }, { status: 400 });
    }

    const result = await prisma.$transaction([
      prisma.booking.update({
        where: { id: id },
        data: {
          status: "CHECKED_OUT",
          actualCheckOut: new Date(),
        }
      }),
      prisma.room.update({
        where: { id: booking.roomId },
        data: { status: "CLEANING" }
      })
    ]);

    return NextResponse.json({ data: result[0] });
  } catch (error) {
    console.error("POST /api/bookings/[id]/checkout error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
