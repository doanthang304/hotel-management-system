"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Link from "next/link";
import { format } from "date-fns";
import { formatVND } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  CheckCircle,
  LogOut,
  Loader2,
  ClipboardList,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Booking = {
  id: string;
  bookingCode: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  guest: { fullName: string; phone: string };
  room: { roomNumber: string };
  roomRate: number;
  numNights: number;
};

const statusLabels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đang ở",
  CHECKED_OUT: "Đã trả phòng",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Vắng mặt",
};

const statusVariants: Record<string, string> = {
  PENDING: "status-pending",
  CONFIRMED: "status-confirmed",
  CHECKED_IN: "status-occupied",
  CHECKED_OUT: "status-checked-out",
  CANCELLED: "status-cancelled",
  NO_SHOW: "status-no-show",
};

export default function BookingsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading: loading, mutate } = useSWR(`/api/bookings?search=${search}`, fetcher);
  const bookings: Booking[] = data?.data || [];

  const handleCheckIn = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}/checkin`, { method: "POST" });
      if (res.ok) {
        toast.success("Check-in thành công");
        mutate();
      } else {
        const error = await res.json();
        toast.error(error.error || "Check-in thất bại");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}/checkout`, { method: "POST" });
      if (res.ok) {
        toast.success("Check-out thành công");
        mutate();
      } else {
        const error = await res.json();
        toast.error(error.error || "Check-out thất bại");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Quản lý đặt phòng</h2>
        <Link href="/bookings/new" className={buttonVariants({ className: "min-h-[44px] shrink-0" })}>
          <Plus className="mr-2 h-4 w-4" /> Tạo booking
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã, tên khách, số điện thoại..."
            className="min-h-[44px] pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ClipboardList className="mb-2 h-10 w-10 opacity-40" />
            <p className="text-sm">Không tìm thấy booking nào.</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <div key={booking.id} className="space-y-2 rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{booking.bookingCode}</span>
                <Badge variant="outline" className={statusVariants[booking.status]}>
                  {statusLabels[booking.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{booking.guest.fullName}</span>
                <span className="text-muted-foreground">Phòng {booking.room.roomNumber}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{format(new Date(booking.checkInDate), "dd/MM/yyyy")} → {format(new Date(booking.checkOutDate), "dd/MM/yyyy")}</span>
                <span>{booking.numNights} đêm</span>
              </div>
              <div className="flex items-center justify-between border-t pt-1">
                <span className="text-sm font-semibold">{formatVND(booking.roomRate * booking.numNights)}</span>
                <div className="flex flex-wrap gap-1">
                  <Link href={`/bookings/${booking.id}`} className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-[36px]" })}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> Xem
                  </Link>
                  <Link href={`/bookings/${booking.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-[36px]" })}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Sửa
                  </Link>
                  {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                    <Button size="sm" className="min-h-[36px]" onClick={() => handleCheckIn(booking.id)}>
                      <CheckCircle className="mr-1 h-3.5 w-3.5" /> Check-in
                    </Button>
                  )}
                  {booking.status === "CHECKED_IN" && (
                    <Button size="sm" variant="outline" className="min-h-[36px] border-[var(--status-maintenance)] text-[var(--status-maintenance)]" onClick={() => handleCheckOut(booking.id)}>
                      <LogOut className="mr-1 h-3.5 w-3.5" /> Check-out
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-25">Mã</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Phòng</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead className="w-12.5"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Không tìm thấy booking nào.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.bookingCode}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{booking.guest.fullName}</span>
                      <span className="text-xs text-muted-foreground">{booking.guest.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>Phòng {booking.room.roomNumber}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{format(new Date(booking.checkInDate), "dd/MM/yyyy")}</span>
                      <span className="text-xs text-muted-foreground">{booking.numNights} đêm</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusVariants[booking.status]}>
                      {statusLabels[booking.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatVND(booking.roomRate * booking.numNights)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link 
                        href={`/bookings/${booking.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 px-2" })}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" /> Chi tiết
                      </Link>
                      
                      <Link 
                        href={`/bookings/${booking.id}/edit`}
                        className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 px-2" })}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Sửa
                      </Link>

                      {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                        <Button 
                          size="sm" 
                          className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white" 
                          onClick={() => handleCheckIn(booking.id)}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" /> Check-in
                        </Button>
                      )}

                      {booking.status === "CHECKED_IN" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-2 border-orange-500 text-orange-600 hover:bg-orange-50" 
                          onClick={() => handleCheckOut(booking.id)}
                        >
                          <LogOut className="mr-1 h-3.5 w-3.5" /> Check-out
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}