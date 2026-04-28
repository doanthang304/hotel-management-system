import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const bill = await prisma.bill.findUnique({
      where: { 
        id: id,
        booking: { hotelId: session.user.hotelId }
      },
      include: {
        booking: {
          include: {
            guest: true,
            room: true,
            bookingServices: {
              include: { service: true }
            }
          }
        },
        payments: {
          orderBy: { receivedAt: "desc" }
        }
      }
    });

    if (!bill) {
      return NextResponse.json({ error: "Không tìm thấy hóa đơn" }, { status: 404 });
    }

    return NextResponse.json({ data: bill });
  } catch (error) {
    console.error("GET /api/bills/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
