import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hotelId = session.user.hotelId;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  try {
    const [roomGroups, checkInsToday, checkOutsToday] = await Promise.all([
      prisma.room.groupBy({
        by: ["status"],
        where: { hotelId },
        _count: { id: true },
      }),
      prisma.booking.count({
        where: {
          hotelId,
          checkInDate: { gte: todayStart, lte: todayEnd },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
      }),
      prisma.booking.count({
        where: {
          hotelId,
          checkOutDate: { gte: todayStart, lte: todayEnd },
          status: "CHECKED_IN",
        },
      }),
    ]);

    // Parse room counts by status
    const counts = Object.fromEntries(
      roomGroups.map((g) => [g.status, g._count.id])
    );

    const totalRooms = roomGroups.reduce((sum, g) => sum + g._count.id, 0);

    return NextResponse.json({
      data: {
        totalRooms,
        occupiedRooms: counts["OCCUPIED"] ?? 0,
        availableRooms: counts["AVAILABLE"] ?? 0,
        cleaningRooms: counts["CLEANING"] ?? 0,
        maintenanceRooms: counts["MAINTENANCE"] ?? 0,
        checkInsToday,
        checkOutsToday,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
