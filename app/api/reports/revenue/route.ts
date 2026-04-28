import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const hotelId = session.user.hotelId;
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const bills = await prisma.bill.findMany({
      where: {
        booking: { hotelId },
        status: "SETTLED",
        finalizedAt: { gte: start, lte: end }
      }
    });

    // Group by day
    const days = eachDayOfInterval({ start, end });
    const data = days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dailyBills = bills.filter(b => b.finalizedAt && format(b.finalizedAt, "yyyy-MM-dd") === dayStr);
      const total = dailyBills.reduce((acc, b) => acc + Number(b.totalAmount), 0);
      return { date: format(day, "dd/MM"), revenue: total };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/reports/revenue error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
