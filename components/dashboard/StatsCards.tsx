"use client";

import { useEffect, useState } from "react";
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        const json = await res.json();
        if (res.ok && json.data) {
          setStats(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Đang sử dụng */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đang sử dụng</CardTitle>
          <BedDouble className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <StatSkeleton />
          ) : (
            <div className="text-2xl font-bold">
              {stats?.occupiedRooms ?? 0}
              <span className="text-base font-normal text-muted-foreground">
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
          <CardTitle className="text-sm font-medium">Phòng trống</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <StatSkeleton />
          ) : (
            <div className="text-2xl font-bold text-green-600">
              {stats?.availableRooms ?? 0}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Sẵn sàng đón khách</p>
        </CardContent>
      </Card>

      {/* Check-in hôm nay */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Check-in hôm nay</CardTitle>
          <CalendarCheck className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <StatSkeleton />
          ) : (
            <div className="text-2xl font-bold text-blue-600">
              {stats?.checkInsToday ?? 0}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Dự kiến nhận phòng</p>
        </CardContent>
      </Card>

      {/* Check-out hôm nay */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Check-out hôm nay</CardTitle>
          <LogOut className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <StatSkeleton />
          ) : (
            <div className="text-2xl font-bold text-orange-600">
              {stats?.checkOutsToday ?? 0}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Dự kiến trả phòng</p>
        </CardContent>
      </Card>
    </div>
  );
}
