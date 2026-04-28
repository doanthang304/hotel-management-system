"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BedDouble, Users, CalendarCheck, LogOut, CheckCircle } from "lucide-react";

export function StatsCards() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    checkInsToday: 0,
    checkOutsToday: 0,
    cleaningRooms: 0,
  });

  useEffect(() => {
    // Replace with real fetch
    setStats({
      totalRooms: 10,
      occupiedRooms: 3,
      availableRooms: 5,
      checkInsToday: 2,
      checkOutsToday: 1,
      cleaningRooms: 2,
    });
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đang sử dụng</CardTitle>
          <BedDouble className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.occupiedRooms} / {stats.totalRooms}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Phòng đang có khách
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Phòng trống</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.availableRooms}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Sẵn sàng đón khách
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Check-in hôm nay</CardTitle>
          <CalendarCheck className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.checkInsToday}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Dự kiến nhận phòng
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Check-out hôm nay</CardTitle>
          <LogOut className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.checkOutsToday}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Dự kiến trả phòng
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
