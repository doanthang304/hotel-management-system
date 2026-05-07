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
    const roomType = await prisma.roomType.findUnique({
      where: {
        id,
        hotelId: session.user.hotelId,
      },
      include: {
        _count: {
          select: { rooms: true },
        },
      },
    });

    if (!roomType) {
      return NextResponse.json({ error: "Không tìm thấy loại phòng" }, { status: 404 });
    }

    if (roomType._count.rooms > 0) {
      return NextResponse.json(
        { error: "Loại phòng đang có phòng sử dụng, không thể xóa" },
        { status: 400 }
      );
    }

    await prisma.roomType.delete({
      where: { id: roomType.id },
    });

    return NextResponse.json({ message: `Đã xóa loại phòng ${roomType.name}` });
  } catch (error) {
    console.error("DELETE /api/room-types/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
