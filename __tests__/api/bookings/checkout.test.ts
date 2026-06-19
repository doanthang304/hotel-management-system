import { NextRequest } from "next/server";
import { POST } from "@/app/api/bookings/[id]/checkout/route";
import { prismaMock } from "../../helpers/prisma-mock";
import { mockSession } from "../../helpers/session-mock";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("POST /api/bookings/[id]/checkout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSession.reset();
  });

  it("should return 401 if unauthorized", async () => {
    mockSession.setSession(null);
    const req = new NextRequest("http://localhost/api/bookings/booking-123/checkout", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "booking-123" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 if booking is not found", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/bookings/booking-123/checkout", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "booking-123" }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Không tìm thấy booking");
  });

  it("should return 400 if booking is not CHECKED_IN", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: "booking-123",
      status: "CONFIRMED",
    } as any);
    const req = new NextRequest("http://localhost/api/bookings/booking-123/checkout", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "booking-123" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Booking không ở trạng thái đang ở");
  });

  it("should check out booking successfully and set room status to AVAILABLE", async () => {
    const mockBooking = {
      id: "booking-123",
      roomId: "room-456",
      status: "CHECKED_IN",
    };
    prismaMock.booking.findUnique.mockResolvedValue(mockBooking as any);
    prismaMock.booking.update.mockResolvedValue({ ...mockBooking, status: "CHECKED_OUT" } as any);
    prismaMock.room.update.mockResolvedValue({ id: "room-456", status: "AVAILABLE" } as any);

    const req = new NextRequest("http://localhost/api/bookings/booking-123/checkout", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "booking-123" }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.status).toBe("CHECKED_OUT");

    expect(prismaMock.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "booking-123" },
      data: expect.objectContaining({
        status: "CHECKED_OUT",
      }),
    }));

    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: "room-456" },
      data: { status: "AVAILABLE" },
    });
  });
});
