import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  try {
    const where: any = { hotelId: session.user.hotelId };
    if (status) where.status = status;

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
    const { roomTypeId, roomNumber, floor } = body;

    if (!roomTypeId || !roomNumber) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Check if room number already exists for this hotel
    const existing = await prisma.room.findUnique({
      where: {
        hotelId_roomNumber: {
          hotelId: session.user.hotelId,
          roomNumber: roomNumber.trim(),
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: `Số phòng ${roomNumber} đã tồn tại` }, { status: 400 });
    }

    const newRoom = await prisma.room.create({
      data: {
        hotelId: session.user.hotelId,
        roomTypeId,
        roomNumber: roomNumber.trim(),
        floor: floor ? Number(floor) : null,
      },
      include: { roomType: true }
    });

    return NextResponse.json({ data: newRoom });
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
