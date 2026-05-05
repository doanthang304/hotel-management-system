import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const room = await prisma.room.findUnique({
      where: {
        id,
        hotelId: session.user.hotelId,
      },
      include: {
        bookings: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Không tìm thấy phòng" }, { status: 404 });
    }

    if (room.bookings.length > 0) {
      return NextResponse.json({ error: "Phòng đã có booking, không thể xóa" }, { status: 400 });
    }

    await prisma.room.delete({ where: { id: room.id } });

    return NextResponse.json({ message: `Đã xóa phòng ${room.roomNumber}` });
  } catch (error) {
    console.error("DELETE /api/rooms/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
