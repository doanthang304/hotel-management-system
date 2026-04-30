"use client";

import { useEffect, useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, BedDouble } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RoomStatusGrid } from "@/components/dashboard/RoomStatusGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

type Room = {
  id: string;
  roomNumber: string;
  status: string;
  roomType: { name: string; roomPrices: any[] };
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Trống",
  OCCUPIED: "Có khách",
  MAINTENANCE: "Bảo trì",
  BLOCKED: "Khóa",
};

const statusVariants: Record<string, string> = {
  AVAILABLE: "status-available",
  OCCUPIED: "status-occupied",
  MAINTENANCE: "status-maintenance",
  BLOCKED: "status-blocked",
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rooms");
      const json = await res.json();
      setRooms(json.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách phòng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Quản lý Phòng</h2>
        <Button render={<Link href="/onboarding" />} nativeButton={false} className="min-h-[44px] shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Thêm phòng
        </Button>
      </div>

      <Tabs defaultValue="grid" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="grid">
              <LayoutGrid className="h-4 w-4 mr-2" /> Sơ đồ
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" /> Danh sách
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="grid" className="space-y-4">
          <RoomStatusGrid />
        </TabsContent>
        
        <TabsContent value="list" className="space-y-4">
          {/* Desktop: Table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số phòng</TableHead>
                  <TableHead>Hạng phòng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Chưa có phòng nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-bold">P{room.roomNumber}</TableCell>
                      <TableCell>{room.roomType.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusVariants[room.status]}>
                          {statusLabels[room.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Card list */}
          <div className="md:hidden space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <span className="text-sm">Đang tải...</span>
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BedDouble className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">Chưa có phòng nào.</p>
              </div>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between rounded-lg border p-3 bg-card">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">P{room.roomNumber}</span>
                    <span className="text-sm text-muted-foreground">{room.roomType.name}</span>
                  </div>
                  <Badge variant="outline" className={statusVariants[room.status]}>
                    {statusLabels[room.status]}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
