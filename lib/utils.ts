import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format tiền VND: 1500000 → "1,500,000 đ"
 */
export function formatVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0 đ";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 đ";
  return new Intl.NumberFormat("vi-VN").format(num) + " đ";
}

/**
 * Format ngày: dd/MM/yyyy
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "dd/MM/yyyy", { locale: vi });
  } catch {
    return "—";
  }
}

/**
 * Format ngày giờ: dd/MM/yyyy HH:mm
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "dd/MM/yyyy HH:mm", { locale: vi });
  } catch {
    return "—";
  }
}

/**
 * Tính số đêm giữa 2 ngày
 */
export function calcNights(checkIn: Date | string, checkOut: Date | string): number {
  const ci = typeof checkIn === "string" ? new Date(checkIn) : checkIn;
  const co = typeof checkOut === "string" ? new Date(checkOut) : checkOut;
  const diff = co.getTime() - ci.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Generate bill number: BILL-YYYYMMDD-NNN
 */
export async function generateBillNumber(count: number): Promise<string> {
  const dateStr = format(new Date(), "yyyyMMdd");
  return `BILL-${dateStr}-${String(count + 1).padStart(3, "0")}`;
}
