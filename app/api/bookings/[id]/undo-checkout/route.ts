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
      include: { room: true, bill: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    if (booking.status !== "CHECKED_OUT") {
      return NextResponse.json({ error: "Booking không ở trạng thái CHECKED_OUT" }, { status: 400 });
    }

    const roomRate = Number(booking.roomRate);
    const numNights = booking.numNights;
    const subtotalRoom = roomRate * numNights;

    const result = await prisma.$transaction(async (tx) => {
      const servicesAgg = await tx.bookingService.aggregate({
        where: { bookingId: booking.id },
        _sum: { subtotal: true },
      });
      const subtotalServices = Number(servicesAgg._sum.subtotal ?? 0);

      const bill = await tx.bill.findUnique({
        where: { bookingId: booking.id },
        include: { payments: true },
      });

      const paidAmount = bill ? bill.payments.reduce((sum, p) => sum + Number(p.amount), 0) : 0;
      const depositApplied = bill ? Number(bill.depositApplied) : Number(booking.depositAmount);
      const discountAmount = bill ? Number(bill.discountAmount) : 0;
      const totalAmount = subtotalRoom + subtotalServices - discountAmount;
      const amountDue = Math.max(0, totalAmount - depositApplied - paidAmount);

      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: "CHECKED_IN",
          actualCheckIn: new Date(),
          actualCheckOut: null,
        },
      });

      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: "OCCUPIED" },
      });

      await tx.bill.upsert({
        where: { bookingId: booking.id },
        update: {
          subtotalRoom,
          subtotalServices,
          totalAmount,
          amountDue,
          status: "OPEN",
        },
        create: {
          bookingId: booking.id,
          billNumber: `BILL-${Date.now()}`,
          subtotalRoom,
          subtotalServices,
          totalAmount,
          depositApplied,
          amountDue,
          status: "OPEN",
        },
      });

      return updatedBooking;
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/undo-checkout error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

