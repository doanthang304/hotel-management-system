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
    });

    if (!booking) return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });

    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Chỉ có thể đánh dấu No-Show khi khách chưa Check-in" },
        { status: 400 }
      );
    }

    // Logic transaction tự động lưu bill nếu có cọc trước

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: "NO_SHOW", 
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}