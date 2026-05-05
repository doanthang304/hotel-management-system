import { NextRequest, NextResponse } from "next/server";
import { RoomStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  try {
    const where: { hotelId: string; status?: RoomStatus } = { hotelId: session.user.hotelId };
    if (status && Object.values(RoomStatus).includes(status as RoomStatus)) {
      where.status = status as RoomStatus;
    }

    const rooms = await prisma.room.findMany({
      where,
      include: { roomType: true },
      orderBy: { roomNumber: "asc" },
    });

    return NextResponse.json({ data: rooms });
  } catch (error) {
    console.error("GET /api/rooms error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { roomTypeId, roomNumber, roomNumbers, floor } = body;

    const normalizedRoomNumbers = Array.isArray(roomNumbers)
      ? roomNumbers
      : typeof roomNumber === "string"
        ? [roomNumber]
        : [];
    const cleanedRoomNumbers = normalizedRoomNumbers
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!roomTypeId || cleanedRoomNumbers.length === 0) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const duplicateInput = cleanedRoomNumbers.find(
      (value, index) => cleanedRoomNumbers.indexOf(value) !== index
    );
    if (duplicateInput) {
      return NextResponse.json({ error: `Số phòng ${duplicateInput} bị trùng trong danh sách` }, { status: 400 });
    }

    const existingRooms = await prisma.room.findMany({
      where: {
        hotelId: session.user.hotelId,
        roomNumber: { in: cleanedRoomNumbers },
      },
      select: { roomNumber: true },
    });

    if (existingRooms.length > 0) {
      return NextResponse.json(
        { error: `Số phòng đã tồn tại: ${existingRooms.map((room) => room.roomNumber).join(", ")}` },
        { status: 400 }
      );
    }

    const createdRooms = await prisma.$transaction(
      cleanedRoomNumbers.map((currentRoomNumber) =>
        prisma.room.create({
          data: {
            hotelId: session.user.hotelId,
            roomTypeId,
            roomNumber: currentRoomNumber,
            floor: floor ? Number(floor) : null,
          },
          include: { roomType: true },
        })
      )
    );

    return NextResponse.json({
      data: createdRooms,
      message:
        createdRooms.length === 1
          ? `Đã tạo phòng ${createdRooms[0].roomNumber}`
          : `Đã tạo ${createdRooms.length} phòng`,
    });
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
