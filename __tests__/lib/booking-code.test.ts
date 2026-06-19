import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/prisma-mock";
import { generateBookingCode, checkRoomAvailability } from "@/lib/booking-code";

describe("Booking Code Helpers (lib/booking-code.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateBookingCode", () => {
    it("should generate first booking code if no previous booking exists", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 19));

      prismaMock.booking.findFirst.mockResolvedValue(null);

      const code = await generateBookingCode("hotel-123");
      expect(code).toBe("BK20260619-001");
      expect(prismaMock.booking.findFirst).toHaveBeenCalledWith({
        where: {
          bookingCode: {
            startsWith: "BK20260619-",
          },
        },
        orderBy: {
          bookingCode: "desc",
        },
      });

      vi.useRealTimers();
    });

    it("should increment sequence if previous booking exists", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 19));

      prismaMock.booking.findFirst.mockResolvedValue({
        bookingCode: "BK20260619-012",
      });

      const code = await generateBookingCode("hotel-123");
      expect(code).toBe("BK20260619-013");

      vi.useRealTimers();
    });
  });

  describe("checkRoomAvailability", () => {
    it("should return true if no conflicting booking is found", async () => {
      prismaMock.booking.findFirst.mockResolvedValue(null);

      const checkIn = new Date("2026-06-19");
      const checkOut = new Date("2026-06-22");
      const available = await checkRoomAvailability("room-123", checkIn, checkOut);

      expect(available).toBe(true);
      expect(prismaMock.booking.findFirst).toHaveBeenCalled();
    });

    it("should return false if conflicting booking exists", async () => {
      prismaMock.booking.findFirst.mockResolvedValue({ id: "conflicting-booking-id" } as any);

      const checkIn = new Date("2026-06-19");
      const checkOut = new Date("2026-06-22");
      const available = await checkRoomAvailability("room-123", checkIn, checkOut);

      expect(available).toBe(false);
    });

    it("should exclude specified booking ID from search", async () => {
      prismaMock.booking.findFirst.mockResolvedValue(null);

      const checkIn = new Date("2026-06-19");
      const checkOut = new Date("2026-06-22");
      await checkRoomAvailability("room-123", checkIn, checkOut, "current-booking-id");

      expect(prismaMock.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "current-booking-id" }
        })
      }));
    });
  });
});
