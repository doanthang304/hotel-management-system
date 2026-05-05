"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, BedDouble, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoomStatusGrid } from "@/components/dashboard/RoomStatusGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Room = {
  id: string;
  roomNumber: string;
  status: string;
  roomType: { name: string; roomPrices: Array<{ pricePerNight: number; isDefault: boolean }> };
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
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rooms");
      const json = await res.json();
      setRooms(json.data || []);
    } catch {
      toast.error("Không thể tải danh sách phòng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleDeleteRoom = async (room: Room) => {
    if (!confirm(`Xóa phòng ${room.roomNumber}?`)) return;

    try {
      setDeletingRoomId(room.id);
      const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Không thể xóa phòng");

      toast.success(json.message || `Đã xóa phòng ${room.roomNumber}`);
      setRooms((prev) => prev.filter((item) => item.id !== room.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa phòng");
    } finally {
      setDeletingRoomId(null);
    }
  };

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
              <LayoutGrid className="mr-2 h-4 w-4" /> Sơ đồ
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="mr-2 h-4 w-4" /> Danh sách
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="grid" className="space-y-4">
          <RoomStatusGrid />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số phòng</TableHead>
                  <TableHead>Hạng phòng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-16"></TableHead>
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
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          disabled={deletingRoomId === room.id}
                          onClick={() => handleDeleteRoom(room)}
                        >
                          {deletingRoomId === room.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <span className="text-sm">Đang tải...</span>
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BedDouble className="mb-2 h-10 w-10 opacity-40" />
                <p className="text-sm">Chưa có phòng nào.</p>
              </div>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">P{room.roomNumber}</span>
                    <span className="text-sm text-muted-foreground">{room.roomType.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusVariants[room.status]}>
                      {statusLabels[room.status]}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      disabled={deletingRoomId === room.id}
                      onClick={() => handleDeleteRoom(room)}
                    >
                      {deletingRoomId === room.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
