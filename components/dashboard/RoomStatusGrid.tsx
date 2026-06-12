"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { RoomStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BedDouble, Loader2 } from "lucide-react";

type Room = {
  id: string;
  roomNumber: string;
  status: RoomStatus;
  roomType: { name: string };
  currentGuest?: string;
  checkOutDate?: string;
};

const statusClasses: Record<RoomStatus, string> = {
  AVAILABLE: "status-available",
  OCCUPIED: "status-occupied",
  MAINTENANCE: "status-maintenance",
  BLOCKED: "status-blocked",
};

const statusLabels: Record<RoomStatus, string> = {
  AVAILABLE: "Trống",
  OCCUPIED: "Đang ở",
  MAINTENANCE: "Bảo trì",
  BLOCKED: "Khóa",
};

const statusDotColors: Record<RoomStatus, string> = {
  AVAILABLE: "bg-[var(--status-available)]",
  OCCUPIED: "bg-[var(--status-occupied)]",
  MAINTENANCE: "bg-[var(--status-maintenance)]",
  BLOCKED: "bg-[var(--status-blocked)]",
};

export function RoomStatusGrid() {
  const { data, isLoading: loading } = useSWR("/api/rooms", fetcher);
  const rooms: Room[] = data?.data || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm">Đang tải sơ đồ phòng...</span>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <BedDouble className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">Chưa có phòng nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(statusLabels) as RoomStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-full", statusDotColors[status])} />
            {statusLabels[status]}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
        {rooms.map((room) => (
          <Card
            key={room.id}
            className={cn(
              "cursor-pointer hover:shadow-md transition-all",
              statusClasses[room.status]
            )}
          >
            <CardContent className="p-3 flex flex-col items-center justify-center space-y-1 text-center min-h-[90px] md:min-h-[110px]">
              <div className="text-xl md:text-2xl font-bold">{room.roomNumber}</div>
              <div className="text-[10px] md:text-xs font-medium opacity-70 truncate w-full">{room.roomType.name}</div>
              <Badge variant="outline" className={cn("text-[10px] md:text-xs mt-1", statusClasses[room.status])}>
                {statusLabels[room.status]}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
