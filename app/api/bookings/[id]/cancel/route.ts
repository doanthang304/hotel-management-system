import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const hotelId = session.user.hotelId;
    const booking = await prisma.booking.findUnique({
      where: { id, hotelId },
      include: { room: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Chỉ có thể hủy khi booking đang ở trạng thái PENDING hoặc CONFIRMED" },
        { status: 400 }
      );
    }

    // Hủy booking chưa check-in => thường không cần rollback trạng thái phòng,
    // vì hệ thống chỉ đổi trạng thái phòng khi check-in/check-out.
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("POST /api/bookings/[id]/cancel error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

