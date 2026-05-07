import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBookingCode, checkRoomAvailability } from "@/lib/booking-code";
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

const BookingCreateSchema = z.object({
  roomId: z.string().uuid(),
  guestId: z.string().uuid().optional(),
  // New guest fields
  guestFullName: z.string().min(1).optional(),
  guestPhone: z.string().optional(),
  guestIdNumber: z.string().optional(),
  guestIdType: z.enum(["CCCD", "PASSPORT", "DRIVER_LICENSE", "OTHER"]).optional(),
  guestNationality: z.string().optional(),

  // Booking fields
  checkInDate: z.string(),
  checkOutDate: z.string(),
  numNights: z.number().int().min(1),
  roomRate: z.number().min(0),
  depositAmount: z.number().min(0).default(0),
  source: z.enum(["WALKIN", "FACEBOOK_ZALO", "BOOKING_COM", "AGODA", "AIRBNB", "OTHER"]).default("WALKIN"),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
  bookingCode: z.string().max(50).optional(),
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
    const checkIn = parseBookingDate(data.checkInDate);
    const checkOut = parseBookingDate(data.checkOutDate);

    if (!checkIn || !checkOut) {
      return NextResponse.json({ error: "Ngày booking không hợp lệ" }, { status: 400 });
    }

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

        },
      });
      guestId = guest.id;
    }

    let bookingCode = data.bookingCode?.trim() || "";
    let booking: Awaited<ReturnType<typeof prisma.booking.create>> | null = null;

    if (bookingCode) {
      try {
        booking = await prisma.booking.create({
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
      } catch (createError: any) {
        if (createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === "P2002") {
          return NextResponse.json({ error: "Mã booking này đã tồn tại trong hệ thống." }, { status: 400 });
        }
        throw createError;
      }
    } else {
      const maxCreateAttempts = 5;
      for (let attempt = 1; attempt <= maxCreateAttempts; attempt += 1) {
        bookingCode = await generateBookingCode(hotelId);
        try {
          booking = await prisma.booking.create({
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
          break;
        } catch (createError) {
          const target = createError instanceof Prisma.PrismaClientKnownRequestError
            ? createError.meta?.target
            : undefined;
          const targetFields = Array.isArray(target)
            ? target
            : typeof target === "string"
              ? [target]
              : [];

          const isBookingCodeCollision =
            createError instanceof Prisma.PrismaClientKnownRequestError &&
            createError.code === "P2002" &&
            targetFields.some((field) => field.includes("bookingCode"));

          if (!isBookingCodeCollision || attempt === maxCreateAttempts) {
            throw createError;
          }
        }
      }
    }

    if (!booking) {
      return NextResponse.json(
        { error: "Không thể tạo mã booking duy nhất, vui lòng thử lại." },
        { status: 409 }
      );
    }

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
  } catch (error: any) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống: " + (error.message || String(error)) }, { status: 500 });
  }
}
