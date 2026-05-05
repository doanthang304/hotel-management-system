import { NextRequest, NextResponse } from "next/server";
import { BookingSource } from "@prisma/client";
import { getServerSession } from "next-auth";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ReportPeriod = "week" | "month" | "year";

const SOURCE_LABELS: Record<BookingSource, string> = {
  WALKIN: "Trực tiếp",
  FACEBOOK_ZALO: "Facebook / Zalo",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
  AIRBNB: "Airbnb",
  DIRECT: "Direct",
  PHONE: "Điện thoại",
  OTHER: "Khác",
};

function parseDateParam(value: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function resolvePeriodRange(period: ReportPeriod, anchorDate: Date) {
  switch (period) {
    case "week":
      return {
        start: startOfWeek(anchorDate, { weekStartsOn: 1 }),
        end: endOfWeek(anchorDate, { weekStartsOn: 1 }),
      };
    case "year":
      return {
        start: startOfYear(anchorDate),
        end: endOfYear(anchorDate),
      };
    case "month":
    default:
      return {
        start: startOfMonth(anchorDate),
        end: endOfMonth(anchorDate),
      };
  }
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hotelId = session.user.hotelId;
  const { searchParams } = new URL(req.url);
  const periodParam = searchParams.get("period");
  const fromParam = parseDateParam(searchParams.get("from"));
  const toParam = parseDateParam(searchParams.get("to"));
  const anchorDate = parseDateParam(searchParams.get("date")) ?? new Date();
  const period: ReportPeriod = periodParam === "week" || periodParam === "year" ? periodParam : "month";

  const resolvedRange = fromParam && toParam
    ? { start: startOfDay(fromParam), end: endOfDay(toParam) }
    : resolvePeriodRange(period, anchorDate);

  const intervalStart = startOfDay(resolvedRange.start);
  const intervalEnd = endOfDay(resolvedRange.end);
  const intervalEndExclusive = addDays(startOfDay(resolvedRange.end), 1);

  try {
    const [bills, bookings, rooms] = await Promise.all([
      prisma.bill.findMany({
        where: {
          booking: { hotelId },
          status: "SETTLED",
          finalizedAt: { gte: intervalStart, lte: intervalEnd },
        },
        include: {
          booking: {
            select: {
              source: true,
              roomId: true,
              room: {
                select: {
                  id: true,
                  roomNumber: true,
                },
              },
            },
          },
        },
      }),
      prisma.booking.findMany({
        where: {
          hotelId,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          checkInDate: { lt: intervalEndExclusive },
          checkOutDate: { gt: intervalStart },
        },
        select: {
          id: true,
          roomId: true,
          source: true,
          checkInDate: true,
          checkOutDate: true,
          room: {
            select: {
              id: true,
              roomNumber: true,
            },
          },
        },
      }),
      prisma.room.findMany({
        where: { hotelId },
        select: {
          id: true,
          roomNumber: true,
        },
        orderBy: { roomNumber: "asc" },
      }),
    ]);

    const roomMetrics = new Map(
      rooms.map((room) => [
        room.id,
        {
          roomId: room.id,
          roomNumber: room.roomNumber,
          revenue: 0,
          bookings: 0,
          occupiedNights: 0,
          occupancyRate: 0,
        },
      ])
    );

    const sourceMetrics = new Map<string, { source: string; label: string; count: number; revenue: number }>();
    let totalOccupiedRoomNights = 0;

    for (const booking of bookings) {
      const overlapStart = booking.checkInDate > intervalStart ? booking.checkInDate : intervalStart;
      const overlapEnd = booking.checkOutDate < intervalEndExclusive ? booking.checkOutDate : intervalEndExclusive;
      const occupiedNights = Math.max(0, differenceInCalendarDays(overlapEnd, overlapStart));

      totalOccupiedRoomNights += occupiedNights;

      const roomEntry = roomMetrics.get(booking.roomId);
      if (roomEntry) {
        roomEntry.bookings += 1;
        roomEntry.occupiedNights += occupiedNights;
      }

      const currentSource = sourceMetrics.get(booking.source) ?? {
        source: booking.source,
        label: SOURCE_LABELS[booking.source] ?? booking.source,
        count: 0,
        revenue: 0,
      };
      currentSource.count += 1;
      sourceMetrics.set(booking.source, currentSource);
    }

    let totalRevenue = 0;
    for (const bill of bills) {
      const revenue = Number(bill.totalAmount);
      totalRevenue += revenue;

      const roomEntry = roomMetrics.get(bill.booking.roomId);
      if (roomEntry) {
        roomEntry.revenue += revenue;
      }

      const sourceKey = bill.booking.source;
      const currentSource = sourceMetrics.get(sourceKey) ?? {
        source: sourceKey,
        label: SOURCE_LABELS[sourceKey] ?? sourceKey,
        count: 0,
        revenue: 0,
      };
      currentSource.revenue += revenue;
      sourceMetrics.set(sourceKey, currentSource);
    }

    const totalDays = Math.max(1, differenceInCalendarDays(intervalEndExclusive, intervalStart));
    const totalRooms = rooms.length;
    const totalAvailableRoomNights = totalRooms * totalDays;
    const occupancyRate = totalAvailableRoomNights > 0
      ? roundOneDecimal((totalOccupiedRoomNights / totalAvailableRoomNights) * 100)
      : 0;

    const revenueTrend = (period === "year"
      ? eachMonthOfInterval({ start: intervalStart, end: intervalEnd })
      : eachDayOfInterval({ start: intervalStart, end: intervalEnd })
    ).map((bucketStart) => {
      const bucketKey = period === "year" ? format(bucketStart, "yyyy-MM") : format(bucketStart, "yyyy-MM-dd");
      const revenue = bills.reduce((sum, bill) => {
        if (!bill.finalizedAt) return sum;
        const billKey = period === "year"
          ? format(bill.finalizedAt, "yyyy-MM")
          : format(bill.finalizedAt, "yyyy-MM-dd");
        return billKey === bucketKey ? sum + Number(bill.totalAmount) : sum;
      }, 0);
      const bookingCount = bookings.reduce((sum, booking) => {
        const bookingKey = period === "year"
          ? format(booking.checkInDate, "yyyy-MM")
          : format(booking.checkInDate, "yyyy-MM-dd");
        return bookingKey === bucketKey ? sum + 1 : sum;
      }, 0);

      return {
        key: bucketKey,
        label: period === "year" ? `T${format(bucketStart, "M")}` : format(bucketStart, "dd/MM"),
        fullLabel: period === "year" ? format(bucketStart, "MM/yyyy") : format(bucketStart, "dd/MM/yyyy"),
        revenue,
        bookings: bookingCount,
      };
    });

    const bookingSources = Array.from(sourceMetrics.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.revenue - a.revenue;
    });

    const roomPerformance = Array.from(roomMetrics.values())
      .map((room) => ({
        ...room,
        occupancyRate: totalDays > 0 ? roundOneDecimal((room.occupiedNights / totalDays) * 100) : 0,
      }))
      .sort((a, b) => {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        if (b.occupiedNights !== a.occupiedNights) return b.occupiedNights - a.occupiedNights;
        return a.roomNumber.localeCompare(b.roomNumber, "vi");
      });

    return NextResponse.json({
      data: {
        meta: {
          period,
          from: intervalStart.toISOString(),
          to: intervalEnd.toISOString(),
          totalDays,
          totalRooms,
        },
        metrics: {
          totalRevenue,
          totalBookings: bookings.length,
          settledBills: bills.length,
          occupancyRate,
          averageRevenuePerRoom: totalRooms > 0 ? Math.round(totalRevenue / totalRooms) : 0,
        },
        revenueTrend,
        bookingSources,
        roomPerformance,
      },
    });
  } catch (error) {
    console.error("GET /api/reports/revenue error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
