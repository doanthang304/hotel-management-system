"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatVND } from "@/lib/utils";
import { BookingStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

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

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  CHECKED_IN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CHECKED_OUT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  NO_SHOW: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const statusLabels = {
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

  if (bookings.length === 0) return <div className="p-4 text-center text-muted-foreground">Chưa có booking nào.</div>;

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold">{booking.guest.fullName}</span>
              <Badge variant="secondary" className="text-xs">
                Phòng {booking.room.roomNumber}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {format(new Date(booking.checkInDate), "dd/MM", { locale: vi })} - {format(new Date(booking.checkOutDate), "dd/MM", { locale: vi })}
            </div>
          </div>
          <div className="text-right">
            <Badge className={statusColors[booking.status]}>
              {statusLabels[booking.status]}
            </Badge>
            <div className="text-sm font-medium mt-1">
              {formatVND(booking.roomRate)}/đêm
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
