// app/api/bookings/[id]/services/[serviceId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Await params trong Next.js 15+
  const { id: bookingId, serviceId } = await params;

  try {
    const hotelId = session.user.hotelId;

    // 1. Kiểm tra booking có hợp lệ và thuộc khách sạn này không
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, hotelId },
      include: { bill: true }
    });

    if (!booking) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    if (booking.status !== "CHECKED_IN") {
      return NextResponse.json(
        { error: "Chỉ có thể thay đổi dịch vụ khi khách đang ở" },
        { status: 400 }
      );
    }

    // 2. Thực hiện xóa và cập nhật Bill trong cùng 1 Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Xóa service
      const deletedService = await tx.bookingService.delete({
        where: { id: serviceId }
      });

      // Tính lại tổng tiền dịch vụ hiện có
      const servicesAgg = await tx.bookingService.aggregate({
        where: { bookingId },
        _sum: { subtotal: true },
      });
      
      const subtotalServices = Number(servicesAgg._sum.subtotal ?? 0);
      const subtotalRoom = Number(booking.roomRate) * booking.numNights;

      // Cập nhật lại Bill
      if (booking.bill) {
        const bill = await tx.bill.findUnique({
          where: { id: booking.bill.id },
          include: { payments: true }
        });

        const paidAmount = bill?.payments.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
        const depositApplied = Number(bill?.depositApplied ?? booking.depositAmount);
        const discountAmount = Number(bill?.discountAmount ?? 0);

        const totalAmount = subtotalRoom + subtotalServices - discountAmount;
        const amountDue = Math.max(0, totalAmount - depositApplied - paidAmount);

        await tx.bill.update({
          where: { id: booking.bill.id },
          data: {
            subtotalServices,
            totalAmount,
            amountDue
          }
        });
      }

      return deletedService;
    });

    return NextResponse.json({ message: "Đã xóa dịch vụ thành công", data: result });
  } catch (error) {
    console.error("DELETE service error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}