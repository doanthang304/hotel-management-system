import { prisma } from "./prisma";
import { format, startOfDay, endOfDay } from "date-fns";

/**
 * Tạo mã booking tự động: BK{YYYYMMDD}-{NNN}
 * Ví dụ: BK20240427-001
 */
export async function generateBookingCode(_hotelId: string): Promise<string> {
  const today = new Date();
  const dateStr = format(today, "yyyyMMdd");

  const lastBooking = await prisma.booking.findFirst({
    where: {
      bookingCode: {
        startsWith: `BK${dateStr}-`,
      },
    },
    orderBy: {
      bookingCode: "desc",
    },
  });

  let nextSequence = 1;
  if (lastBooking) {
    const parts = lastBooking.bookingCode.split("-");
    if (parts.length === 2) {
      nextSequence = parseInt(parts[1], 10) + 1;
    }
  }

  return `BK${dateStr}-${String(nextSequence).padStart(3, "0")}`;
}

/**
 * Kiểm tra phòng còn trống trong khoảng ngày (tránh double-booking)
 * Trả về true nếu phòng AVAILABLE
 *
 * @param tx - Optional Prisma transaction client for atomic operations
 */
export async function checkRoomAvailability(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<boolean> {
  const db = tx ?? prisma;
  const conflict = await db.booking.findFirst({
    where: {
      roomId,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      AND: [
        { checkInDate: { lt: checkOut } },
        { checkOutDate: { gt: checkIn } },
      ],
    },
  });
  return !conflict;
}
