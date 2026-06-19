import { describe, it, expect, vi } from "vitest";
import {
  formatVND,
  formatDate,
  formatDateTime,
  calcNights,
  generateBillNumber,
  formatInputNumber,
  parseInputNumber,
} from "@/lib/utils";

describe("Utility Functions (lib/utils.ts)", () => {
  describe("formatVND", () => {
    it("should format numbers to VND currency format", () => {
      expect(formatVND(1500000)).toBe("1.500.000 đ");
    });

    it("should handle string input", () => {
      expect(formatVND("2000000")).toBe("2.000.000 đ");
    });

    it("should return '0 đ' for null, undefined or NaN values", () => {
      expect(formatVND(null)).toBe("0 đ");
      expect(formatVND(undefined)).toBe("0 đ");
      expect(formatVND("invalid-number")).toBe("0 đ");
    });
  });

  describe("formatDate", () => {
    it("should format Date objects or valid date strings to dd/MM/yyyy", () => {
      const date = new Date(2026, 5, 19); // Month is 0-indexed (June)
      expect(formatDate(date)).toBe("19/06/2026");
      expect(formatDate("2026-06-19T12:00:00Z")).toBe("19/06/2026");
    });

    it("should return '—' for null, undefined or invalid dates", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate(undefined)).toBe("—");
      expect(formatDate("invalid-date")).toBe("—");
    });
  });

  describe("formatDateTime", () => {
    it("should format Date objects or valid date strings to dd/MM/yyyy HH:mm", () => {
      const date = new Date(2026, 5, 19, 14, 35);
      expect(formatDateTime(date)).toBe("19/06/2026 14:35");
      expect(formatDateTime("2026-06-19T14:35:00")).toBe("19/06/2026 14:35");
    });

    it("should return '—' for invalid or empty inputs", () => {
      expect(formatDateTime(null)).toBe("—");
      expect(formatDateTime("invalid-date")).toBe("—");
    });
  });

  describe("calcNights", () => {
    it("should calculate correct number of nights between two dates", () => {
      const checkIn = new Date(2026, 5, 19);
      const checkOut = new Date(2026, 5, 22);
      expect(calcNights(checkIn, checkOut)).toBe(3);
    });

    it("should return at least 1 night even if checking out on the same day", () => {
      const checkIn = new Date(2026, 5, 19);
      const checkOut = new Date(2026, 5, 19);
      expect(calcNights(checkIn, checkOut)).toBe(1);
    });

    it("should support date strings as arguments", () => {
      expect(calcNights("2026-06-19", "2026-06-24")).toBe(5);
    });
  });

  describe("generateBillNumber", () => {
    it("should generate bill number with format BILL-YYYYMMDD-NNN", async () => {
      // Mock system date to 2026-06-19
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 19));

      const billNum = await generateBillNumber(4); // count = 4, next is 5
      expect(billNum).toBe("BILL-20260619-005");

      vi.useRealTimers();
    });
  });

  describe("formatInputNumber", () => {
    it("should format raw numbers to standard dotted format", () => {
      expect(formatInputNumber(2000000)).toBe("2.000.000");
      expect(formatInputNumber("1500000")).toBe("1.500.000");
    });

    it("should handle non-digit inputs correctly by removing them", () => {
      expect(formatInputNumber("2.500.000")).toBe("2.500.000");
      expect(formatInputNumber("3abc500xyz")).toBe("3.500");
    });

    it("should return empty string for null, undefined or empty input", () => {
      expect(formatInputNumber(null)).toBe("");
      expect(formatInputNumber(undefined)).toBe("");
      expect(formatInputNumber("")).toBe("");
    });
  });

  describe("parseInputNumber", () => {
    it("should parse dotted or comma string numbers to raw number", () => {
      expect(parseInputNumber("2.000.000")).toBe(2000000);
      expect(parseInputNumber("1,500,000")).toBe(1500000);
    });

    it("should return 0 for invalid, null or undefined input", () => {
      expect(parseInputNumber(null)).toBe(0);
      expect(parseInputNumber(undefined)).toBe(0);
      expect(parseInputNumber("")).toBe(0);
      expect(parseInputNumber("abc")).toBe(0);
    });
  });
});
