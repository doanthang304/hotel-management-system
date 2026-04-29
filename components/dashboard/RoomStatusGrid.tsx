"use client";

import { useEffect, useState } from "react";
import { RoomStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Room = {
  id: string;
  roomNumber: string;
  status: RoomStatus;
  roomType: { name: string };
  currentGuest?: string;
  checkOutDate?: string;
};

const statusColors: Record<RoomStatus, string> = {
  AVAILABLE: "bg-green-500/10 text-green-500 border-green-500/20",
  OCCUPIED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  MAINTENANCE: "bg-red-500/10 text-red-500 border-red-500/20",
  BLOCKED: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const statusLabels: Record<RoomStatus, string> = {
  AVAILABLE: "Trống",
  OCCUPIED: "Đang ở",
  MAINTENANCE: "Bảo trì",
  BLOCKED: "Khóa",
};

export function RoomStatusGrid() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await fetch("/api/rooms");
        if (res.ok) {
          const json = await res.json();
          setRooms(json.data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, []);

  if (loading) return <div>Đang tải sơ đồ phòng...</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {rooms.map((room) => (
        <Card 
          key={room.id} 
          className={cn(
            "cursor-pointer hover:shadow-md transition-all",
            statusColors[room.status]
          )}
        >
          <CardContent className="p-4 flex flex-col items-center justify-center space-y-2 text-center min-h-[120px]">
            <div className="text-2xl font-bold">{room.roomNumber}</div>
            <div className="text-sm font-medium opacity-80">{room.roomType.name}</div>
            <Badge variant="outline" className={cn("mt-2", statusColors[room.status])}>
              {statusLabels[room.status]}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
