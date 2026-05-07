import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRoomAvailability } from "@/lib/booking-code";
import { z } from "zod";

function parseBookingDate(value: string) {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const BookingUpdateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"]).optional(),
  roomId: z.string().uuid().optional(),
  bookingCode: z.string().max(50).optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  numNights: z.number().int().min(1).optional(),
  roomRate: z.number().min(0).optional(),
  depositAmount: z.number().min(0).optional(),
  source: z.enum(["WALKIN", "FACEBOOK_ZALO", "BOOKING_COM", "AGODA", "AIRBNB", "OTHER"]).optional(),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
  guestFullName: z.string().min(1).optional(),
  guestPhone: z.string().optional(),
  guestIdNumber: z.string().optional(),
  guestIdType: z.enum(["CCCD", "PASSPORT", "DRIVER_LICENSE", "OTHER"]).optional(),
  guestNationality: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const booking = await prisma.booking.findUnique({
      where: {
        id,
        hotelId: session.user.hotelId,
      },
      include: {
        room: { include: { roomType: true } },
        guest: true,
        creator: { select: { id: true, fullName: true } },
        bill: {
          include: {
            payments: true,
          },
        },
        bookingServices: {
          include: { service: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    return NextResponse.json({ data: booking });
  } catch (error) {
    console.error("GET /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = BookingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const hotelId = session.user.hotelId;
    const existing = await prisma.booking.findUnique({
      where: { id, hotelId },
      include: { guest: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    const parsedCheckIn = parsed.data.checkInDate ? parseBookingDate(parsed.data.checkInDate) : null;
    const parsedCheckOut = parsed.data.checkOutDate ? parseBookingDate(parsed.data.checkOutDate) : null;
    if ((parsed.data.checkInDate && !parsedCheckIn) || (parsed.data.checkOutDate && !parsedCheckOut)) {
      return NextResponse.json({ error: "Ngày booking không hợp lệ" }, { status: 400 });
    }

    const nextCheckIn = parsedCheckIn ?? existing.checkInDate;
    const nextCheckOut = parsedCheckOut ?? existing.checkOutDate;
    const nextRoomId = parsed.data.roomId ?? existing.roomId;

    if (nextCheckOut <= nextCheckIn) {
      return NextResponse.json({ error: "Ngày trả phòng phải sau ngày nhận phòng" }, { status: 400 });
    }

    const roomAvailable = await checkRoomAvailability(nextRoomId, nextCheckIn, nextCheckOut, existing.id);
    if (!roomAvailable) {
      return NextResponse.json({ error: "Phòng đã có booking trong khoảng thời gian này" }, { status: 400 });
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.guest.update({
          where: { id: existing.guestId },
          data: {
            fullName: parsed.data.guestFullName,
            phone: parsed.data.guestPhone,
            idNumber: parsed.data.guestIdNumber,
            idType: parsed.data.guestIdType,
            nationality: parsed.data.guestNationality,
          },
        });

        return tx.booking.update({
          where: { id },
          data: {
            status: parsed.data.status,
            roomId: parsed.data.roomId,
            bookingCode: parsed.data.bookingCode?.trim() || undefined,
            checkInDate: parsed.data.checkInDate ? nextCheckIn : undefined,
            checkOutDate: parsed.data.checkOutDate ? nextCheckOut : undefined,
            numNights: parsed.data.numNights,
            roomRate: parsed.data.roomRate,
            depositAmount: parsed.data.depositAmount,
            source: parsed.data.source,
            specialRequests: parsed.data.specialRequests,
            internalNotes: parsed.data.internalNotes,
          },
          include: {
            room: { include: { roomType: true } },
            guest: true,
          },
        });
      });

      await prisma.auditLog.create({
        data: {
          hotelId,
          userId: session.user.id,
          entityType: "booking",
          entityId: updated.id,
          action: "update",
          newValues: parsed.data,
          oldValues: existing as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json({ data: updated });
    } catch (updateError) {
      if (updateError instanceof Prisma.PrismaClientKnownRequestError && updateError.code === "P2002") {
        return NextResponse.json({ error: "Mã booking này đã tồn tại trong hệ thống." }, { status: 400 });
      }
      throw updateError;
    }
  } catch (error) {
    console.error("PUT /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const hotelId = session.user.hotelId;
    const existing = await prisma.booking.findUnique({
      where: { id, hotelId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    await prisma.booking.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Đã xóa booking" });
  } catch (error) {
    console.error("DELETE /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
