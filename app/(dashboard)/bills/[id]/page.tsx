"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Receipt,CreditCard,Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,DialogClose} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState("Tiền mặt");
  
  // Set giá trị mặc định khi mở Dialog
  useEffect(() => {
  if (bill && showConfirmPayment) {
    setPayAmount(Number(bill.amountDue));
  }
  }, [bill, showConfirmPayment]);

  const fetchBill = async () => {
    try {
      const res = await fetch(`/api/bills/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBill(json.data);
    } catch (error: any) {
      toast.error(error.message || "Không thể tải chi tiết hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (payAmount <= 0 && bill.amountDue > 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/bills/${id}/pay`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payAmount, method: payMethod })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Thanh toán thành công!");
      setShowConfirmPayment(false);
      fetchBill(); // Refresh data
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi xử lý thanh toán");
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    fetchBill();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Đang tải...</div>;
  if (!bill) return <div className="p-8 text-center">Không tìm thấy hóa đơn.</div>;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Chi tiết Hóa đơn</h2>
          <Badge 
            variant="outline" 
            className={Number(bill.amountDue) <= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}
          >
            {Number(bill.amountDue) <= 0 ? "Đã thanh toán" : "Chưa thanh toán hết"}
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" /> In hóa đơn
          </Button>
          
          <Dialog open={showConfirmPayment} onOpenChange={setShowConfirmPayment}>
            <DialogTrigger render={
              <Button disabled={bill.status === "SETTLED"}>
                <CreditCard className="h-4 w-4 mr-2" /> Thanh toán
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Xác nhận thanh toán</DialogTitle>
                <DialogDescription>
                  Hóa đơn này sẽ được đánh dấu là đã thanh toán toàn bộ. Bạn đã nhận đủ số tiền <strong>{formatVND(bill.amountDue)}</strong> từ khách hàng chưa?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2">
                <DialogClose render={<Button variant="outline" disabled={paymentLoading} />}>
                  Hủy
                </DialogClose>
                <Button onClick={handleConfirmPayment} disabled={paymentLoading}>
                  {paymentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Xác nhận đã thu tiền
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Receipt className="h-5 w-5 mr-2 text-primary" />
                  Hóa đơn #{bill.billNumber}
                </div>
                <span className="text-sm font-normal text-muted-foreground">
                  Ngày tạo: {format(new Date(bill.createdAt), "dd/MM/yyyy HH:mm")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      Tiền phòng ({bill.booking.room.roomNumber})
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(bill.booking.checkInDate), "dd/MM")} - {format(new Date(bill.booking.checkOutDate), "dd/MM")}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">{bill.booking.numNights}</TableCell>
                    <TableCell className="text-right">{formatVND(bill.booking.roomRate)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatVND(bill.subtotalRoom)}</TableCell>
                  </TableRow>
                  
                  {/* Dịch vụ */}
                  {bill.booking.bookingServices?.map((bs: any) => (
                    <TableRow key={bs.id}>
                      <TableCell>{bs.serviceName}</TableCell>
                      <TableCell className="text-right">{Number(bs.quantity)}</TableCell>
                      <TableCell className="text-right">{formatVND(Number(bs.unitPrice))}</TableCell>
                      <TableCell className="text-right font-semibold">{formatVND(Number(bs.subtotal))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-sm">
                  <span>Tạm tính phòng:</span>
                  <span>{formatVND(bill.subtotalRoom)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tạm tính dịch vụ:</span>
                  <span>{formatVND(bill.subtotalServices)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Thuế/Phí:</span>
                  <span>{formatVND(bill.taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Tổng cộng:</span>
                  <span className="text-primary">{formatVND(bill.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Đã đặt cọc:</span>
                  <span>-{formatVND(bill.depositApplied)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Đã thanh toán:</span>
                  <span>-{formatVND(bill.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-xl">
                  <span>Còn lại:</span>
                  <span>{formatVND(bill.amountDue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Thông tin khách hàng</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="font-bold">{bill.booking.guest.fullName}</p>
              <p>{bill.booking.guest.phone}</p>
              <Separator />
              <p className="text-xs text-muted-foreground pt-2">Mã đặt phòng: {bill.booking.guest.bookingCode}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Lịch sử thanh toán</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={bill.status === "SETTLED"}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {bill.payments?.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Chưa có giao dịch thanh toán.</p>
              ) : (
                <div className="space-y-3">
                  {bill.payments?.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium">{formatVND(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(p.receivedAt), "dd/MM HH:mm")}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{p.method}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
