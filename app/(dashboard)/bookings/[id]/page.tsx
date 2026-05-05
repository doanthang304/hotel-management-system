"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Printer, 
  Calendar, 
  User, 
  Hotel, 
  CheckCircle, 
  LogOut,
  Ban,
  Receipt,
  Plus,
  Loader2,
  Trash2,
  Pencil
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Link from "next/link";
import type { BookingService, BookingWithRelations } from "@/types";

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

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [booking, setBooking] = useState<BookingWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingService, setAddingService] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [newService, setNewService] = useState({
    serviceName: "",
    unitPrice: 0,
    quantity: 1,
  });

  const fetchBooking = async () => {
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBooking(json.data as BookingWithRelations);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể tải chi tiết booking";
      toast.error(message);
      router.push("/bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBooking();
  }, [id]);

  const handleAddService = async () => {
    if (!newService.serviceName.trim()) {
      toast.error("Vui lòng nhập tên dịch vụ");
      return;
    }
    if (!Number.isFinite(newService.unitPrice) || newService.unitPrice < 0) {
      toast.error("Đơn giá không hợp lệ");
      return;
    }
    if (!Number.isFinite(newService.quantity) || newService.quantity <= 0) {
      toast.error("Số lượng phải lớn hơn 0");
      return;
    }

    try {
      setAddingService(true);
      const res = await fetch(`/api/bookings/${id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName: newService.serviceName,
          unitPrice: Number(newService.unitPrice),
          quantity: Number(newService.quantity),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Không thể thêm dịch vụ");

      toast.success("Đã thêm dịch vụ vào booking");
      setNewService({ serviceName: "", unitPrice: 0, quantity: 1 });
      fetchBooking();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Lỗi hệ thống";
      toast.error(message);
    } finally {
      setAddingService(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa dịch vụ này không?")) return;
    
    try {
      setDeletingServiceId(serviceId);
      const res = await fetch(`/api/bookings/${id}/services/${serviceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Không thể xóa dịch vụ");
      }

      toast.success("Đã xóa dịch vụ");
      fetchBooking();
    } catch (error: any) {
      toast.error(error.message || "Lỗi hệ thống");
    } finally {
      setDeletingServiceId(null);
    }
  };

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

  if (loading) return <div className="p-8 text-center text-muted-foreground">Đang tải...</div>;
  if (!booking) return null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => router.back()} className="min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Chi tiết đặt phòng</h2>
          <Badge variant="outline" className={statusVariants[booking.status]}>
            {statusLabels[booking.status]}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`/bookings/${id}/edit`} />} className="min-h-[44px]">
            <Pencil className="h-4 w-4 mr-2" /> Sửa
          </Button>
          <Button variant="outline" className="min-h-[44px]">
            <Printer className="h-4 w-4 mr-2" /> In phiếu
          </Button>
          {booking.status === "CHECKED_IN" && booking.bill?.id && (
            <Button variant="default" nativeButton={false} render={<Link href={`/bills/${booking.bill.id}`} />} className="min-h-[44px]">
              <Receipt className="h-4 w-4 mr-2" /> Xem hóa đơn
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Mobile: Actions on top ── */}
        <div className="space-y-6 lg:order-2">
          {/* Quick actions — shown first on mobile */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Thao tác nhanh</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button variant="outline" className="w-full justify-start min-h-[44px]" nativeButton={false} render={<Link href={`/bookings/${id}/edit`} />}>
                <Pencil className="mr-2 h-4 w-4" /> Sửa thông tin
              </Button>
              {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                <Button className="w-full justify-start min-h-[48px] text-base" onClick={() => handleAction("checkin")}>
                  <CheckCircle className="mr-2 h-5 w-5" /> Thực hiện Check-in
                </Button>
              )}
              {booking.status === "CHECKED_IN" && (
                <Button className="w-full justify-start min-h-[48px] text-base bg-orange-600 hover:bg-orange-700" onClick={() => handleAction("checkout")}>
                  <LogOut className="mr-2 h-5 w-5" /> Thực hiện Check-out
                </Button>
              )}
              {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                <Button variant="outline" className="w-full justify-start min-h-[44px] text-red-600 border-red-500/20 hover:bg-red-50 hover:text-red-700" onClick={() => handleAction("cancel")}>
                  <Ban className="mr-2 h-4 w-4" /> Hủy đặt phòng
                </Button>
              )}
              {booking.status === "CHECKED_OUT" && (
                <Button
                  variant="outline"
                  className="w-full justify-start min-h-[44px] border-orange-500/20 text-orange-600 hover:bg-orange-50"
                  onClick={() => handleAction("undo-checkout")}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Hoàn tác Check-out
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-primary" />
                Khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Họ tên</p>
                <p className="font-bold">{booking.guest.fullName}</p>
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
              <div className="pt-1">
                <p className="text-sm text-muted-foreground">Người tạo</p>
                <p className="text-sm">{booking.creator.fullName} ({format(new Date(booking.createdAt), "dd/MM HH:mm")})</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Main content ── */}
        <div className="lg:col-span-2 space-y-6 lg:order-1">
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
                <p className="font-semibold">{formatVND(Number(booking.roomRate))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng tiền phòng</p>
                <p className="font-bold text-lg text-primary">{formatVND(Number(booking.roomRate) * booking.numNights)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Dịch vụ sử dụng</span>
                {booking.status !== "CHECKED_IN" && (
                  <Badge variant="outline">Chỉ thêm khi đang ở</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.bookingServices?.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Chưa có dịch vụ nào được thêm.</p>
              ) : (
                <div className="space-y-2">
                  {booking.bookingServices?.map((service: BookingService) => (
                    <div key={service.id} className="rounded-md border p-3 flex items-center justify-between group">
                      <div>
                        <p className="font-medium">{service.serviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(service.quantity)} x {formatVND(Number(service.unitPrice))}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className="font-semibold">{formatVND(Number(service.subtotal))}</p>

                        {/* Nút Xóa (chỉ hiển thị khi đang CHECKED_IN) */}
                        {booking.status === "CHECKED_IN" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            disabled={deletingServiceId === service.id}
                            onClick={() => handleDeleteService(service.id)}
                          >
                            {deletingServiceId === service.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5 space-y-1">
                  <Label>Tên dịch vụ</Label>
                  <Input
                    value={newService.serviceName}
                    disabled={booking.status !== "CHECKED_IN" || addingService}
                    placeholder="VD: Giặt ủi, Ăn sáng..."
                    onChange={(e) =>
                      setNewService((prev) => ({
                        ...prev,
                        serviceName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label>Đơn giá (VND)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newService.unitPrice}
                    disabled={booking.status !== "CHECKED_IN" || addingService}
                    onChange={(e) =>
                      setNewService((prev) => ({
                        ...prev,
                        unitPrice: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label>SL</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newService.quantity}
                    disabled={booking.status !== "CHECKED_IN" || addingService}
                    onChange={(e) =>
                      setNewService((prev) => ({
                        ...prev,
                        quantity: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    className="w-full"
                    onClick={handleAddService}
                    disabled={booking.status !== "CHECKED_IN" || addingService}
                  >
                    {addingService ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Thêm
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Tạm tính: {formatVND(Number(newService.unitPrice) * Number(newService.quantity || 0))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
      </div>
    </div>
  );
}
