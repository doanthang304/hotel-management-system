import { NextRequest } from "next/server";
import { POST } from "@/app/api/bookings/[id]/checkin/route";
import { prismaMock } from "../../helpers/prisma-mock";
import { mockSession } from "../../helpers/session-mock";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("POST /api/bookings/[id]/checkin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSession.reset();
  });

  it("should return 401 if unauthorized", async () => {
    mockSession.setSession(null);
    const req = new NextRequest("http://localhost/api/bookings/booking-123/checkin", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "booking-123" }) });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("should return 404 if booking is not found", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/bookings/booking-123/checkin", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "booking-123" }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Không tìm thấy booking");
  });

  it("should return 400 if booking status is not PENDING or CONFIRMED", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: "booking-123",
      status: "CHECKED_IN",
    } as any);
    const req = new NextRequest("http://localhost/api/bookings/booking-123/checkin", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "booking-123" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Booking không ở trạng thái có thể check-in");
  });

  it("should check in booking successfully and create a bill", async () => {
    const mockBooking = {
      id: "booking-123",
      roomId: "room-456",
      status: "CONFIRMED",
      roomRate: 500000,
      numNights: 2,
      depositAmount: 100000,
    };
    prismaMock.booking.findUnique.mockResolvedValue(mockBooking as any);
    prismaMock.booking.update.mockResolvedValue({ ...mockBooking, status: "CHECKED_IN" } as any);
    prismaMock.room.update.mockResolvedValue({ id: "room-456", status: "OCCUPIED" } as any);
    prismaMock.bill.upsert.mockResolvedValue({ id: "bill-789" } as any);

    const req = new NextRequest("http://localhost/api/bookings/booking-123/checkin", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "booking-123" }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.status).toBe("CHECKED_IN");

    expect(prismaMock.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "booking-123" },
      data: expect.objectContaining({
        status: "CHECKED_IN",
      }),
    }));

    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: "room-456" },
      data: { status: "OCCUPIED" },
    });

    expect(prismaMock.bill.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { bookingId: "booking-123" },
      create: expect.objectContaining({
        bookingId: "booking-123",
        subtotalRoom: 1000000,
        depositApplied: 100000,
        amountDue: 900000,
      }),
    }));
  });
});
