import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { roomNumber, roomTypeId, floor } = body;

    // Verify room exists and belongs to this hotel
    const existingRoom = await prisma.room.findUnique({
      where: { id, hotelId: session.user.hotelId },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: "Không tìm thấy phòng" }, { status: 404 });
    }

    // If roomNumber is changing, check for duplicates
    if (roomNumber && roomNumber !== existingRoom.roomNumber) {
      const duplicate = await prisma.room.findFirst({
        where: {
          hotelId: session.user.hotelId,
          roomNumber: roomNumber.trim(),
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Số phòng ${roomNumber} đã tồn tại` },
          { status: 400 }
        );
      }
    }

    // If roomTypeId is changing, verify the room type exists
    if (roomTypeId && roomTypeId !== existingRoom.roomTypeId) {
      const roomType = await prisma.roomType.findUnique({
        where: { id: roomTypeId },
      });
      if (!roomType || roomType.hotelId !== session.user.hotelId) {
        return NextResponse.json(
          { error: "Loại phòng không hợp lệ" },
          { status: 400 }
        );
      }
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        ...(roomNumber ? { roomNumber: roomNumber.trim() } : {}),
        ...(roomTypeId ? { roomTypeId } : {}),
        ...(floor !== undefined ? { floor: floor ? Number(floor) : null } : {}),
      },
      include: { roomType: true },
    });

    return NextResponse.json({
      data: updatedRoom,
      message: `Đã cập nhật phòng ${updatedRoom.roomNumber}`,
    });
  } catch (error) {
    console.error("PATCH /api/rooms/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

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
