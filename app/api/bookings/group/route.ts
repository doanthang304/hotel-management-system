import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRoomAvailability } from "@/lib/booking-code";
import { z } from "zod";
import { format } from "date-fns";

function parseBookingDate(value: string) {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const GroupBookingCreateSchema = z.object({
  roomIds: z.array(z.string().uuid()).min(2, "Vui lòng chọn ít nhất 2 phòng"),
  guestId: z.string().uuid().optional(),
  
  guestFullName: z.string().min(1).optional(),
  guestPhone: z.string().optional(),
  guestIdNumber: z.string().optional(),
  guestIdType: z.enum(["CCCD", "PASSPORT", "DRIVER_LICENSE", "OTHER"]).optional(),
  guestNationality: z.string().optional(),

  checkInDate: z.string(),
  checkOutDate: z.string(),
  numNights: z.number().int().min(1),
  roomRate: z.number().min(0),
  depositAmount: z.number().min(0).default(0),
  source: z.enum(["WALKIN", "FACEBOOK_ZALO", "BOOKING_COM", "AGODA", "AIRBNB", "INTERNAL_OTA", "OTHER"]).default("WALKIN"),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
});

async function generateGroupBaseCode(): Promise<string> {
  const today = new Date();
  const dateStr = format(today, "yyyyMMdd");

  const lastBooking = await prisma.booking.findFirst({
    where: {
      bookingCode: {
        startsWith: `GR${dateStr}-`,
      },
    },
    orderBy: {
      bookingCode: "desc",
    },
  });

  let nextSequence = 1;
  if (lastBooking) {
    const parts = lastBooking.bookingCode.split("-");
    if (parts.length >= 2) {
      nextSequence = parseInt(parts[1], 10) + 1;
    }
  }

  return `GR${dateStr}-${String(nextSequence).padStart(3, "0")}`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = GroupBookingCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const checkIn = parseBookingDate(data.checkInDate);
    const checkOut = parseBookingDate(data.checkOutDate);

    if (!checkIn || !checkOut || checkOut <= checkIn) {
      return NextResponse.json({ error: "Ngày booking không hợp lệ" }, { status: 400 });
    }

    const hotelId = session.user.hotelId;

    let guestId = data.guestId;
    if (!guestId) {
      if (!data.guestFullName) return NextResponse.json({ error: "Cần thông tin khách hàng" }, { status: 400 });
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

    let groupCode = "";
    const createdBookings = await prisma.$transaction(async (tx) => {
      // 1. Check availability
      for (const roomId of data.roomIds) {
        const available = await checkRoomAvailability(roomId, checkIn, checkOut, undefined, tx);
        if (!available) {
          throw new Error(`ROOM_CONFLICT:${roomId}`);
        }
      }

      // 2. Create bookings with retry for unique group code
      const maxAttempts = 5;
      let bookings = [];
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        groupCode = await generateGroupBaseCode(); // GR20240427-001
        
        try {
          bookings = [];
          const splitDeposit = Math.floor(data.depositAmount / data.roomIds.length);
          let remainingDeposit = data.depositAmount;

          for (let i = 0; i < data.roomIds.length; i++) {
            const roomId = data.roomIds[i];
            const isLast = i === data.roomIds.length - 1;
            const depositForThisRoom = isLast ? remainingDeposit : splitDeposit;
            remainingDeposit -= depositForThisRoom;

            const roomBookingCode = `${groupCode}-${i + 1}`; // GR20240427-001-1

            const booking = await tx.booking.create({
              data: {
                hotelId,
                roomId,
                guestId: guestId!,
                createdBy: session.user.id,
                bookingCode: roomBookingCode,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                numNights: data.numNights,
                roomRate: data.roomRate,
                depositAmount: depositForThisRoom,
                status: "PENDING",
                source: data.source,
                specialRequests: data.specialRequests,
                internalNotes: data.internalNotes ? `${data.internalNotes} (Đoàn: ${groupCode})` : `Đặt phòng đoàn: ${groupCode}`,
              }
            });
            bookings.push(booking);
          }
          
          return bookings;
        } catch (error) {
          const target = error instanceof Prisma.PrismaClientKnownRequestError ? error.meta?.target : undefined;
          const targetFields = Array.isArray(target) ? target : (typeof target === "string" ? [target] : []);
          
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && targetFields.some(f => f.includes("bookingCode"))) {
            if (attempt === maxAttempts) throw error;
          } else {
            throw error;
          }
        }
      }
      return null;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!createdBookings) {
      return NextResponse.json({ error: "Không thể tạo mã đoàn duy nhất, vui lòng thử lại." }, { status: 409 });
    }

    // Audit logs
    for (const booking of createdBookings) {
      await prisma.auditLog.create({
        data: {
          hotelId,
          userId: session.user.id,
          entityType: "booking",
          entityId: booking.id,
          action: "create",
          newValues: { bookingCode: booking.bookingCode, status: "PENDING" },
        },
      });
    }

    return NextResponse.json({ success: true, groupCode }, { status: 201 });
  } catch (error: any) {
    if (error?.message?.startsWith("ROOM_CONFLICT:")) {
      return NextResponse.json({ error: "Một trong các phòng đã được đặt trong khoảng thời gian này" }, { status: 400 });
    }
    console.error("POST /api/bookings/group error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống: " + (error.message || String(error)) }, { status: 500 });
  }
}