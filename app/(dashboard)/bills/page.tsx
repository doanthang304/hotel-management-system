"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { formatVND } from "@/lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Eye, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Bill = {
  id: string;
  billNumber: string;
  totalAmount: number;
  amountDue: number;
  status: string;
  createdAt: string;
  booking: {
    bookingCode: string;
    guest: { fullName: string };
    room: { roomNumber: string };
  };
};

const statusLabels: Record<string, string> = {
  OPEN: "Chưa thanh toán",
  PARTIAL: "Thanh toán một phần",
  SETTLED: "Đã thanh toán",
  VOID: "Hủy bỏ",
};

const statusVariants: Record<string, string> = {
  OPEN: "status-open",
  PARTIAL: "status-partial",
  SETTLED: "status-settled",
  VOID: "status-void",
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/bills");
      const json = await res.json();
      setBills(json.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Hóa đơn</h2>
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Receipt className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Chưa có hóa đơn nào.</p>
          </div>
        ) : (
          bills.map((bill) => (
            <div key={bill.id} className="rounded-lg border p-3 space-y-2 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{bill.billNumber}</span>
                </div>
                <Badge variant="outline" className={statusVariants[bill.status]}>
                  {statusLabels[bill.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{bill.booking.guest.fullName}</span>
                <span className="text-muted-foreground">{bill.booking.bookingCode}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Phòng {bill.booking.room.roomNumber}</span>
                <span className="font-semibold">{formatVND(bill.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t">
                <span className={bill.amountDue > 0 ? "text-red-500 font-semibold text-sm" : "text-green-500 font-semibold text-sm"}>
                  Còn lại: {formatVND(bill.amountDue)}
                </span>
                <Link href={`/bills/${bill.id}`} className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-[36px]" })}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Xem
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số hóa đơn</TableHead>
              <TableHead>Mã đặt phòng</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Còn nợ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Xem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Chưa có hóa đơn nào.
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      {bill.billNumber}
                    </div>
                  </TableCell>
                  <TableCell>{bill.booking.bookingCode}</TableCell>
                  <TableCell>{bill.booking.guest.fullName}</TableCell>
                  <TableCell className="font-semibold">{formatVND(bill.totalAmount)}</TableCell>
                  <TableCell className={bill.amountDue > 0 ? "text-red-500 font-semibold" : "text-green-500 font-semibold"}>
                    {formatVND(bill.amountDue)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusVariants[bill.status]}>
                      {statusLabels[bill.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link 
                      href={`/bills/${bill.id}`} 
                      className={buttonVariants({ variant: "ghost", size: "icon" })}
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
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
