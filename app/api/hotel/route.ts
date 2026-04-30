import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id: session.user.hotelId },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Không tìm thấy thông tin khách sạn" }, { status: 404 });
    }

    return NextResponse.json({ data: hotel });
  } catch (error) {
    console.error("GET /api/hotel error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, address, phone, email, currency, timezone } = body;

    if (!name) {
      return NextResponse.json({ error: "Tên khách sạn là bắt buộc" }, { status: 400 });
    }

    const updatedHotel = await prisma.hotel.update({
      where: { id: session.user.hotelId },
      data: {
        name,
        address,
        phone,
        email,
        currency,
        timezone,
      },
    });

    return NextResponse.json({ data: updatedHotel });
  } catch (error) {
    console.error("PATCH /api/hotel error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
