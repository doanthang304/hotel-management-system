import { NextRequest } from "next/server";
import { POST } from "@/app/api/bookings/route";
import { prismaMock } from "../../helpers/prisma-mock";
import { mockSession } from "../../helpers/session-mock";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the booking-code helper functions
vi.mock("@/lib/booking-code", () => ({
  generateBookingCode: vi.fn(async () => "BK20260619-001"),
  checkRoomAvailability: vi.fn(async () => true),
}));

import { checkRoomAvailability, generateBookingCode } from "@/lib/booking-code";

describe("POST /api/bookings", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSession.reset();
    vi.mocked(checkRoomAvailability).mockResolvedValue(true);
    vi.mocked(generateBookingCode).mockResolvedValue("BK20260619-001");
  });

  const validPayload = {
    roomId: "550e8400-e29b-41d4-a716-446655440000",
    guestId: "550e8400-e29b-41d4-a716-446655440001",
    checkInDate: "2026-06-19",
    checkOutDate: "2026-06-22",
    numNights: 3,
    roomRate: 500000,
    depositAmount: 100000,
    source: "WALKIN",
  };

  it("should return 401 if unauthorized", async () => {
    mockSession.setSession(null);
    const req = new NextRequest("http://localhost/api/bookings", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if validation fails (e.g. invalid uuid)", async () => {
    const invalidPayload = { ...validPayload, roomId: "invalid-uuid" };
    const req = new NextRequest("http://localhost/api/bookings", {
      method: "POST",
      body: JSON.stringify(invalidPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 if checkOutDate is before or equal to checkInDate", async () => {
    const invalidPayload = {
      ...validPayload,
      checkInDate: "2026-06-19",
      checkOutDate: "2026-06-18",
    };
    const req = new NextRequest("http://localhost/api/bookings", {
      method: "POST",
      body: JSON.stringify(invalidPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Ngày trả phòng phải sau ngày nhận phòng");
  });

  it("should return 400 if room has booking conflict", async () => {
    vi.mocked(checkRoomAvailability).mockResolvedValue(false);

    const req = new NextRequest("http://localhost/api/bookings", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Phòng đã có booking trong khoảng thời gian này");
  });

  it("should create booking successfully with existing guestId", async () => {
    const mockCreatedBooking = {
      id: "booking-123",
      bookingCode: "BK20260619-001",
      status: "PENDING",
    };
    prismaMock.booking.create.mockResolvedValue(mockCreatedBooking as any);

    const req = new NextRequest("http://localhost/api/bookings", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.id).toBe("booking-123");
    expect(prismaMock.booking.create).toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });

  it("should create a new guest if guestId is not provided", async () => {
    const payloadWithoutGuestId = {
      ...validPayload,
      guestId: undefined,
      guestFullName: "Khach Hang Moi",
      guestPhone: "0987654321",
    };
    const mockGuest = { id: "new-guest-uuid", fullName: "Khach Hang Moi" };
    const mockCreatedBooking = { id: "booking-123", bookingCode: "BK20260619-001" };

    prismaMock.guest.create.mockResolvedValue(mockGuest as any);
    prismaMock.booking.create.mockResolvedValue(mockCreatedBooking as any);

    const req = new NextRequest("http://localhost/api/bookings", {
      method: "POST",
      body: JSON.stringify(payloadWithoutGuestId),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(prismaMock.guest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fullName: "Khach Hang Moi",
        phone: "0987654321",
      }),
    });
  });
});
