"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Printer, 
  Calendar, 
  User, 
  Hotel, 
  CheckCircle, 
  LogOut,
  Ban,
  Receipt
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Link from "next/link";

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

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchBooking = async () => {
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBooking(json.data);
    } catch (error: any) {
      toast.error(error.message || "Không thể tải chi tiết booking");
      router.push("/bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}/${action}`, { method: "POST" });
      if (res.ok) {
        toast.success("Thao tác thành công");
        fetchBooking();
      } else {
        const error = await res.json();
        toast.error(error.error || "Thao tác thất bại");
      }
    } catch (error) {
      toast.error("Lỗi hệ thống");
    }
  };

  if (loading) return <div className="p-8 text-center">Đang tải...</div>;
  if (!booking) return null;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Chi tiết đặt phòng</h2>
          <Badge variant="outline" className={statusVariants[booking.status]}>
            {statusLabels[booking.status]}
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" /> In phiếu
          </Button>
          {booking.status === "CHECKED_IN" && booking.bill?.id && (
            <Button variant="default" render={<Link href={`/bills/${booking.bill.id}`} />}>
              <Receipt className="h-4 w-4 mr-2" /> Xem hóa đơn
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                Thông tin lưu trú - {booking.bookingCode}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nhận phòng</p>
                <p className="font-semibold">{format(new Date(booking.checkInDate), "dd/MM/yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trả phòng</p>
                <p className="font-semibold">{format(new Date(booking.checkOutDate), "dd/MM/yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Số đêm</p>
                <p className="font-semibold">{booking.numNights} đêm</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nguồn</p>
                <Badge variant="secondary">{booking.source}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hotel className="h-5 w-5 mr-2 text-primary" />
                Thông tin phòng
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Số phòng</p>
                <p className="font-bold text-lg">{booking.room.roomNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hạng phòng</p>
                <p className="font-semibold">{booking.room.roomType.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giá mỗi đêm</p>
                <p className="font-semibold">{formatVND(booking.roomRate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng tiền phòng</p>
                <p className="font-bold text-lg text-primary">{formatVND(booking.roomRate * booking.numNights)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Yêu cầu đặc biệt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm italic">{booking.specialRequests || "Không có yêu cầu"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ghi chú nội bộ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm italic">{booking.internalNotes || "Không có ghi chú"}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-primary" />
                Khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Họ tên</p>
                <p className="font-bold">{booking.guest.fullName}</p>
                {booking.guest.isVip && <Badge className="bg-amber-500 mt-1">VIP</Badge>}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Số điện thoại</p>
                <p className="font-semibold">{booking.guest.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giấy tờ ({booking.guest.idType})</p>
                <p className="font-semibold">{booking.guest.idNumber || "N/A"}</p>
              </div>
              <Separator />
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">Người tạo</p>
                <p className="text-sm">{booking.creator.fullName} ({format(new Date(booking.createdAt), "dd/MM HH:mm")})</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider opacity-60 font-bold">Thao tác nhanh</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                <Button className="w-full justify-start" onClick={() => handleAction("checkin")}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Thực hiện Check-in
                </Button>
              )}
              {booking.status === "CHECKED_IN" && (
                <Button className="w-full justify-start bg-orange-600 hover:bg-orange-700" onClick={() => handleAction("checkout")}>
                  <LogOut className="mr-2 h-4 w-4" /> Thực hiện Check-out
                </Button>
              )}
              {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                <Button variant="outline" className="w-full justify-start text-red-500 border-red-500/20 hover:bg-red-50" onClick={() => handleAction("cancel")}>
                  <Ban className="mr-2 h-4 w-4" /> Hủy đặt phòng
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
