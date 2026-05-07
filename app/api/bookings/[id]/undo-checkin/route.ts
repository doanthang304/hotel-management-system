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
      where: { id, hotelId },
      include: {
        room: true,
        bill: {
          include: { payments: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    if (booking.status !== "CHECKED_IN") {
      return NextResponse.json({ error: "Booking không ở trạng thái CHECKED_IN" }, { status: 400 });
    }

    // Block undo if there are payments already recorded
    if (booking.bill && booking.bill.payments.length > 0) {
      return NextResponse.json(
        { error: "Không thể hoàn tác check-in vì hóa đơn đã có thanh toán" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Revert booking to PENDING
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: "PENDING",
          actualCheckIn: null,
        },
      });

      // Set room back to AVAILABLE
      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: "AVAILABLE" },
      });

      // Delete the bill created during check-in (if exists and has no payments)
      if (booking.bill) {
        await tx.bill.delete({
          where: { id: booking.bill.id },
        });
      }

      return updatedBooking;
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("POST /api/bookings/[id]/undo-checkin error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
