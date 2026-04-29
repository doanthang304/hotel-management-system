"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Search, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Guest = {
  id: string;
  fullName: string;
  phone: string;
  idNumber: string;
  idType: string;
  nationality: string;
  isVip: boolean;
  totalStays: number;
  totalSpent: number;
  _count: { bookings: number };
};

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/guests?search=${search}`);
      const json = await res.json();
      setGuests(json.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, [search]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Danh sách khách hàng</h2>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm theo tên, SĐT, số giấy tờ..." 
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
              <TableHead>Khách hàng</TableHead>
              <TableHead>Liên hệ</TableHead>
              <TableHead>Giấy tờ</TableHead>
              <TableHead>Lượt ở</TableHead>
              <TableHead>Tổng chi tiêu</TableHead>
              <TableHead>Phân loại</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : guests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Không tìm thấy khách hàng nào.
                </TableCell>
              </TableRow>
            ) : (
              guests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{guest.fullName}</span>
                      <span className="text-xs text-muted-foreground">{guest.nationality}</span>
                    </div>
                  </TableCell>
                  <TableCell>{guest.phone || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{guest.idNumber || "N/A"}</span>
                      <span className="text-xs text-muted-foreground">{guest.idType}</span>
                    </div>
                  </TableCell>
                  <TableCell>{guest._count.bookings} lượt</TableCell>
                  <TableCell className="font-medium">{formatVND(guest.totalSpent)}</TableCell>
                  <TableCell>
                    {guest.isVip ? (
                      <Badge className="bg-amber-500">VIP</Badge>
                    ) : (
                      <Badge variant="outline">Thường</Badge>
                    )}
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
