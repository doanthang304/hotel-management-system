import { prisma } from "./prisma";
import { format, startOfDay, endOfDay } from "date-fns";

/**
 * Tạo mã booking tự động: BK{YYYYMMDD}-{NNN}
 * Ví dụ: BK20240427-001
 */
export async function generateBookingCode(hotelId: string): Promise<string> {
  const today = new Date();
  const dateStr = format(today, "yyyyMMdd");

  const count = await prisma.booking.count({
    where: {
      hotelId,
      createdAt: {
        gte: startOfDay(today),
        lte: endOfDay(today),
      },
    },
  });

  return `BK${dateStr}-${String(count + 1).padStart(3, "0")}`;
}

/**
 * Kiểm tra phòng còn trống trong khoảng ngày (tránh double-booking)
 * Trả về true nếu phòng AVAILABLE
 */
export async function checkRoomAvailability(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const conflict = await prisma.booking.findFirst({
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
