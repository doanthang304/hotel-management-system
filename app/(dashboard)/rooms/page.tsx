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
import { Plus, LayoutGrid, List } from "lucide-react";
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
  AVAILABLE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  OCCUPIED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  MAINTENANCE: "bg-red-500/10 text-red-600 border-red-500/20",
  BLOCKED: "bg-slate-500/10 text-slate-600 border-slate-500/20",
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Quản lý Phòng</h2>
        <Button render={<Link href="/onboarding" />} nativeButton={false}>
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
          <div className="rounded-md border bg-white dark:bg-slate-900">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
