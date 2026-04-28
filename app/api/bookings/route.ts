import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBookingCode, checkRoomAvailability } from "@/lib/booking-code";
import { z } from "zod";

const BookingCreateSchema = z.object({
  roomId: z.string().uuid(),
  guestId: z.string().uuid().optional(),
  // New guest fields
  guestFullName: z.string().min(1).optional(),
  guestPhone: z.string().optional(),
  guestIdNumber: z.string().optional(),
  guestIdType: z.enum(["CCCD", "PASSPORT", "DRIVER_LICENSE", "OTHER"]).optional(),
  guestNationality: z.string().optional(),
  guestIsVip: z.boolean().optional(),
  // Booking fields
  checkInDate: z.string(),
  checkOutDate: z.string(),
  numNights: z.number().int().min(1),
  roomRate: z.number().min(0),
  depositAmount: z.number().min(0).default(0),
  source: z.enum(["DIRECT", "PHONE", "WALKIN", "BOOKING_COM", "AGODA", "AIRBNB", "OTHER"]).default("DIRECT"),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    const where: Record<string, unknown> = { hotelId: session.user.hotelId };

    if (status && status !== "ALL") {
      where.status = status;
    }
    if (dateFrom || dateTo) {
      where.checkInDate = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { bookingCode: { contains: search, mode: "insensitive" } },
        { guest: { fullName: { contains: search, mode: "insensitive" } } },
        { guest: { phone: { contains: search } } },
        { room: { roomNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          room: { include: { roomType: true } },
          guest: true,
          creator: { select: { id: true, fullName: true } },
          bill: true,
        },
        orderBy: { checkInDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({ data: bookings, total, page, limit });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = BookingCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const checkIn = new Date(data.checkInDate);
    const checkOut = new Date(data.checkOutDate);

    if (checkOut <= checkIn) {
      return NextResponse.json({ error: "Ngày trả phòng phải sau ngày nhận phòng" }, { status: 400 });
    }

    // Check availability
    const available = await checkRoomAvailability(data.roomId, checkIn, checkOut);
    if (!available) {
      return NextResponse.json({ error: "Phòng đã có booking trong khoảng thời gian này" }, { status: 400 });
    }

    const hotelId = session.user.hotelId;

    // Get or create guest
    let guestId = data.guestId;
    if (!guestId) {
      if (!data.guestFullName) {
        return NextResponse.json({ error: "Cần thông tin khách hàng" }, { status: 400 });
      }
      const guest = await prisma.guest.create({
        data: {
          hotelId,
          fullName: data.guestFullName,
          phone: data.guestPhone,
          idNumber: data.guestIdNumber,
          idType: data.guestIdType || "CCCD",
          nationality: data.guestNationality || "Việt Nam",
          isVip: data.guestIsVip || false,
        },
      });
      guestId = guest.id;
    }

    const bookingCode = await generateBookingCode(hotelId);

    const booking = await prisma.booking.create({
      data: {
        hotelId,
        roomId: data.roomId,
        guestId,
        createdBy: session.user.id,
        bookingCode,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numNights: data.numNights,
        roomRate: data.roomRate,
        depositAmount: data.depositAmount,
        status: "PENDING",
        source: data.source,
        specialRequests: data.specialRequests,
        internalNotes: data.internalNotes,
      },
      include: {
        room: { include: { roomType: true } },
        guest: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        hotelId,
        userId: session.user.id,
        entityType: "booking",
        entityId: booking.id,
        action: "create",
        newValues: { bookingCode, status: "PENDING" },
      },
    });

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
