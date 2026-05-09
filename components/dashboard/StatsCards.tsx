"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BedDouble, CheckCircle, CalendarCheck, LogOut, Wrench, Loader2 } from "lucide-react";

type Stats = {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  cleaningRooms: number;
  maintenanceRooms: number;
  checkInsToday: number;
  checkOutsToday: number;
};

function StatSkeleton() {
  return (
    <div className="h-6 w-16 animate-pulse rounded-md bg-muted" />
  );
}

export function StatsCards() {
  const { data, isLoading: loading } = useSWR("/api/dashboard/stats", fetcher);
  const stats: Stats | null = data?.data || null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {/* Đang sử dụng */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Đang sử dụng</CardTitle>
          <BedDouble className="h-5 w-5 text-(--status-occupied)" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <StatSkeleton />
          ) : (
            <div className="text-2xl font-bold tabular-nums">
              {stats?.occupiedRooms ?? 0}
              <span className="text-sm font-normal text-muted-foreground">
                /{stats?.totalRooms ?? 0}
              </span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Phòng đang có khách</p>
        </CardContent>
      </Card>

      {/* Phòng trống */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Phòng trống</CardTitle>
          <CheckCircle className="h-5 w-5 text-(--status-available)" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <StatSkeleton />
          ) : (
            <div className="text-2xl font-bold tabular-nums text-(--status-available)">
              {stats?.availableRooms ?? 0}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Sẵn sàng đón khách</p>
        </CardContent>
      </Card>

      {/* Check-in hôm nay */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Check-in hôm nay</CardTitle>
          <CalendarCheck className="h-5 w-5 text-(--status-confirmed)" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <StatSkeleton />
          ) : (
            <div className="text-2xl font-bold tabular-nums text-(--status-confirmed)">
              {stats?.checkInsToday ?? 0}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Dự kiến nhận phòng</p>
        </CardContent>
      </Card>

      {/* Check-out hôm nay */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Check-out hôm nay</CardTitle>
          <LogOut className="h-5 w-5 text-(--status-maintenance)" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <StatSkeleton />
          ) : (
            <div className="text-2xl font-bold tabular-nums text-(--status-maintenance)">
              {stats?.checkOutsToday ?? 0}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Dự kiến trả phòng</p>
        </CardContent>
      </Card>
    </div>
  );
}
