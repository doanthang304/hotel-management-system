"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatVND } from "@/lib/utils";
import { BookingStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

type BookingSummary = {
  id: string;
  bookingCode: string;
  checkInDate: string;
  checkOutDate: string;
  status: BookingStatus;
  guest: { fullName: string };
  room: { roomNumber: string };
  roomRate: number;
};

const statusClasses: Record<string, string> = {
  PENDING: "status-pending",
  CONFIRMED: "status-confirmed",
  CHECKED_IN: "status-occupied",
  CHECKED_OUT: "status-checked-out",
  CANCELLED: "status-cancelled",
  NO_SHOW: "status-no-show",
};

const statusLabels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đang ở",
  CHECKED_OUT: "Đã trả phòng",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Khách không đến",
};

export function RecentBookings() {
  const [bookings, setBookings] = useState<BookingSummary[]>([]);

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch("/api/bookings?limit=5");
        if (res.ok) {
          const json = await res.json();
          setBookings(json.data || []);
        }
      } catch (error) {
        console.error(error);
      }
    }
    fetchBookings();
  }, []);

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ClipboardList className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">Chưa có booking nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{booking.guest.fullName}</span>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                Phòng {booking.room.roomNumber}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {format(new Date(booking.checkInDate), "dd/MM", { locale: vi })} - {format(new Date(booking.checkOutDate), "dd/MM", { locale: vi })}
            </div>
          </div>
          <div className="text-right shrink-0 ml-3">
            <Badge variant="outline" className={statusClasses[booking.status]}>
              {statusLabels[booking.status]}
            </Badge>
            <div className="text-xs font-medium mt-1 text-muted-foreground">
              {formatVND(booking.roomRate)}/đêm
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
