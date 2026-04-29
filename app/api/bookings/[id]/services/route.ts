import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AddBookingServiceSchema = z.object({
  serviceId: z.string().uuid().optional(),
  serviceName: z.string().min(1).optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const parsed = AddBookingServiceSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const hotelId = session.user.hotelId;
    const data = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id, hotelId },
      include: { bill: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    if (booking.status !== "CHECKED_IN") {
      return NextResponse.json(
        { error: "Chỉ có thể thêm dịch vụ khi khách đang ở (CHECKED_IN)" },
        { status: 400 }
      );
    }

    let serviceId: string | null = null;
    let serviceName = data.serviceName ?? "";
    let unitPrice = data.unitPrice ?? 0;

    if (data.serviceId) {
      const service = await prisma.serviceCatalog.findFirst({
        where: { id: data.serviceId, hotelId, isActive: true },
      });
      if (!service) {
        return NextResponse.json({ error: "Dịch vụ không hợp lệ hoặc đã ngừng kinh doanh" }, { status: 400 });
      }
      serviceId = service.id;
      serviceName = service.name;
      unitPrice = Number(service.unitPrice);
    } else {
      if (!serviceName.trim()) {
        return NextResponse.json({ error: "Thiếu tên dịch vụ" }, { status: 400 });
      }
      unitPrice = data.unitPrice ?? 0;
    }

    const quantity = Number(data.quantity);
    const subtotal = quantity * unitPrice;

    const result = await prisma.$transaction(async (tx) => {
      const bookingService = await tx.bookingService.create({
        data: {
          bookingId: booking.id,
          serviceId,
          serviceName,
          quantity,
          unitPrice,
          subtotal,
          recordedBy: session.user.id,
          notes: data.notes,
        },
      });

      const servicesAgg = await tx.bookingService.aggregate({
        where: { bookingId: booking.id },
        _sum: { subtotal: true },
      });
      const subtotalServices = Number(servicesAgg._sum.subtotal ?? 0);
      const subtotalRoom = Number(booking.roomRate) * booking.numNights;

      const bill = booking.bill
        ? await tx.bill.findUnique({
            where: { id: booking.bill.id },
            include: { payments: true },
          })
        : null;

      const paidAmount = bill
        ? bill.payments.reduce((sum, p) => sum + Number(p.amount), 0)
        : 0;
      const depositApplied = bill ? Number(bill.depositApplied) : Number(booking.depositAmount);
      const discountAmount = bill ? Number(bill.discountAmount) : 0;

      const totalAmount = subtotalRoom + subtotalServices - discountAmount;
      const amountDue = Math.max(0, totalAmount - depositApplied - paidAmount);

      const updatedBill = bill
        ? await tx.bill.update({
            where: { id: bill.id },
            data: {
              subtotalRoom,
              subtotalServices,
              totalAmount,
              amountDue,
            },
          })
        : await tx.bill.create({
            data: {
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

      return { bookingService, bill: updatedBill };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bookings/[id]/services error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
