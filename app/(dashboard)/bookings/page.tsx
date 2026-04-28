"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatVND } from "@/lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye,
  CheckCircle,
  LogOut
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
  PENDING: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20",
  CONFIRMED: "bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20",
  CHECKED_IN: "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20",
  CHECKED_OUT: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  CANCELLED: "bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20",
  NO_SHOW: "bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bookings?search=${search}`);
      const json = await res.json();
      setBookings(json.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [search]);

  const handleCheckIn = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}/checkin`, { method: "POST" });
      if (res.ok) {
        toast.success("Check-in thành công");
        fetchBookings();
      } else {
        const error = await res.json();
        toast.error(error.error || "Check-in thất bại");
      }
    } catch (error) {
      toast.error("Lỗi hệ thống");
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}/checkout`, { method: "POST" });
      if (res.ok) {
        toast.success("Check-out thành công");
        fetchBookings();
      } else {
        const error = await res.json();
        toast.error(error.error || "Check-out thất bại");
      }
    } catch (error) {
      toast.error("Lỗi hệ thống");
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Quản lý đặt phòng</h2>
        <div className="flex items-center space-x-2">
          <Button render={<Link href="/bookings/new" />}>
            <Plus className="mr-2 h-4 w-4" /> Tạo booking
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm theo mã, tên khách, số điện thoại..." 
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Mã</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Phòng</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead className="w-[50px]"></TableHead>
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
                      <span className="text-xs text-muted-foreground">
                        {booking.numNights} đêm
                      </span>
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                        <DropdownMenuItem render={<Link href={`/bookings/${booking.id}`} />}>
                          <Eye className="mr-2 h-4 w-4" /> Chi tiết
                        </DropdownMenuItem>
                        {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                          <DropdownMenuItem onClick={() => handleCheckIn(booking.id)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Check-in
                          </DropdownMenuItem>
                        )}
                        {booking.status === "CHECKED_IN" && (
                          <DropdownMenuItem onClick={() => handleCheckOut(booking.id)}>
                            <LogOut className="mr-2 h-4 w-4 text-orange-500" /> Check-out
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
