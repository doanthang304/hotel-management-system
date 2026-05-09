"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
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
import { Plus, Settings2, Wrench, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  isActive: boolean;
};

export default function ServicesPage() {
  const { data, isLoading: loading } = useSWR("/api/services", fetcher);
  const services: Service[] = data?.data || [];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Danh mục dịch vụ</h2>
        <Button disabled className="min-h-[44px] shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Thêm dịch vụ
        </Button>
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Wrench className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Chưa có dịch vụ nào.</p>
          </div>
        ) : (
          services.map((service) => (
            <div key={service.id} className="rounded-lg border p-3 space-y-2 bg-card">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{service.name}</span>
                {service.isActive ? (
                  <Badge className="status-available">Đang kinh doanh</Badge>
                ) : (
                  <Badge variant="secondary">Ngừng kinh doanh</Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{service.unit}</span>
                <span className="font-semibold text-foreground">{formatVND(service.unitPrice)}</span>
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
              <TableHead>Tên dịch vụ</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead>Đơn giá</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right w-[100px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Chưa có dịch vụ nào.
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{service.unit}</TableCell>
                  <TableCell className="font-semibold">{formatVND(service.unitPrice)}</TableCell>
                  <TableCell>
                    {service.isActive ? (
                      <Badge className="status-available">Đang kinh doanh</Badge>
                    ) : (
                      <Badge variant="secondary">Ngừng kinh doanh</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Settings2 className="h-4 w-4" />
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
