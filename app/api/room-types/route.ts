import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const roomTypes = await prisma.roomType.findMany({
      where: { hotelId: session.user.hotelId },
      include: {
        roomPrices: {
          where: { isDefault: true },
        },
        _count: {
          select: { rooms: true }
        }
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: roomTypes });
  } catch (error) {
    console.error("GET /api/room-types error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, maxOccupancy, pricePerNight } = body;

    if (!name || maxOccupancy == null || pricePerNight == null) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Check if name already exists
    const existing = await prisma.roomType.findUnique({
      where: {
        hotelId_name: {
          hotelId: session.user.hotelId,
          name: name.trim(),
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Tên loại phòng đã tồn tại" }, { status: 400 });
    }

    const newRoomType = await prisma.$transaction(async (tx) => {
      const rt = await tx.roomType.create({
        data: {
          hotelId: session.user.hotelId,
          name: name.trim(),
          maxOccupancy: Number(maxOccupancy),
          amenities: [],
        },
      });

      await tx.roomPrice.create({
        data: {
          roomTypeId: rt.id,
          label: "Giá mặc định",
          pricePerNight: Number(pricePerNight),
          isDefault: true,
        },
      });

      return rt;
    });

    return NextResponse.json({ data: newRoomType });
  } catch (error) {
    console.error("POST /api/room-types error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
