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
      include: { room: true }
    });

    if (!booking) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
      return NextResponse.json({ error: "Booking không ở trạng thái có thể check-in" }, { status: 400 });
    }

    const roomRate = Number(booking.roomRate);
    const numNights = booking.numNights;
    const depositAmount = Number(booking.depositAmount);
    const subtotalRoom = roomRate * numNights;

    const result = await prisma.$transaction([
      prisma.booking.update({
        where: { id: id },
        data: {
          status: "CHECKED_IN",
          actualCheckIn: new Date(),
        }
      }),
      prisma.room.update({
        where: { id: booking.roomId },
        data: { status: "OCCUPIED" }
      }),
      prisma.bill.upsert({
        where: { bookingId: id },
        update: {},
        create: {
          bookingId: id,
          billNumber: `BILL-${Date.now()}`,
          subtotalRoom: subtotalRoom,
          totalAmount: subtotalRoom,
          depositApplied: depositAmount,
          amountDue: subtotalRoom - depositAmount,
          status: "OPEN"
        }
      })
    ]);

    return NextResponse.json({ data: result[0] });
  } catch (error) {
    console.error("POST /api/bookings/[id]/checkin error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
