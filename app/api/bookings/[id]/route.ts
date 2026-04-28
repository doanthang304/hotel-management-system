import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const BookingUpdateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"]).optional(),
  roomId: z.string().uuid().optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  numNights: z.number().int().min(1).optional(),
  roomRate: z.number().min(0).optional(),
  depositAmount: z.number().min(0).optional(),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const booking = await prisma.booking.findUnique({
      where: { 
        id: id,
        hotelId: session.user.hotelId 
      },
      include: {
        room: { include: { roomType: true } },
        guest: true,
        creator: { select: { id: true, fullName: true } },
        bill: {
          include: {
            payments: true
          }
        },
        bookingServices: {
          include: { service: true }
        }
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    return NextResponse.json({ data: booking });
  } catch (error) {
    console.error("GET /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = BookingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const hotelId = session.user.hotelId;
    const existing = await prisma.booking.findUnique({
      where: { id: id, hotelId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    const updated = await prisma.booking.update({
      where: { id: id },
      data: parsed.data,
      include: {
        room: true,
        guest: true
      }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        hotelId,
        userId: session.user.id,
        entityType: "booking",
        entityId: updated.id,
        action: "update",
        newValues: parsed.data,
        oldValues: existing as any
      }
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PUT /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const hotelId = session.user.hotelId;
    const existing = await prisma.booking.findUnique({
      where: { id: id, hotelId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
    }

    await prisma.booking.delete({
      where: { id: id }
    });

    return NextResponse.json({ message: "Đã xóa booking" });
  } catch (error) {
    console.error("DELETE /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
