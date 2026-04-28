import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomStatusGrid } from "@/components/dashboard/RoomStatusGrid";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentBookings } from "@/components/dashboard/RecentBookings";

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tổng quan</h2>
      </div>
      
      <StatsCards />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 lg:col-span-5">
          <CardHeader>
            <CardTitle>Sơ đồ phòng hiện tại</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <RoomStatusGrid />
          </CardContent>
        </Card>
        <Card className="col-span-4 md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle>Giao dịch gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentBookings />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
