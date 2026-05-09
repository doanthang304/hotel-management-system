"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
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
import { Search, UserPlus, Users as UsersIcon, Loader2 } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const { data, isLoading: loading } = useSWR(`/api/guests?search=${search}`, fetcher);
  const guests: Guest[] = data?.data || [];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Danh sách khách hàng</h2>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, SĐT, số giấy tờ..."
            className="pl-8 min-h-[44px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <UsersIcon className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Không tìm thấy khách hàng nào.</p>
          </div>
        ) : (
          guests.map((guest) => (
            <div key={guest.id} className="rounded-lg border p-3 space-y-2 bg-card">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{guest.fullName}</span>
                {guest.isVip ? (
                  <Badge className="bg-amber-500 text-white">VIP</Badge>
                ) : (
                  <Badge variant="outline">Thường</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{guest.phone || "N/A"}</span>
                <span>{guest.idNumber || "N/A"}</span>
                <span>{guest._count.bookings} lượt ở</span>
                <span className="font-semibold text-foreground">{formatVND(guest.totalSpent)}</span>
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
                      <Badge className="bg-amber-500 text-white">VIP</Badge>
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
