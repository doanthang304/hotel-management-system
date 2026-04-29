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
import { Button } from "@/components/ui/button";
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
  OPEN: "bg-red-500/10 text-red-600 border-red-500/20",
  PARTIAL: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  SETTLED: "bg-green-500/10 text-green-600 border-green-500/20",
  VOID: "bg-gray-500/10 text-gray-600 border-gray-500/20",
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Hóa đơn</h2>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số hóa đơn</TableHead>
              <TableHead>Mã đặt phòng</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Còn nợ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
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
                    <div className="flex items-center">
                      <Receipt className="h-4 w-4 mr-2 text-muted-foreground" />
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
                    <Button variant="ghost" 
                            size="icon" 
                            nativeButton={false} 
                            render={<Link href={`/bills/${bill.id}`} 
                            />}>
                      <Eye className="h-4 w-4" />
                    </Button>
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
