import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomStatusGrid } from "@/components/dashboard/RoomStatusGrid";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentBookings } from "@/components/dashboard/RecentBookings";

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Tổng quan</h2>
      </div>
      
      <StatsCards />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sơ đồ phòng hiện tại</CardTitle>
          </CardHeader>
          <CardContent className="px-3">
            <RoomStatusGrid />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Giao dịch gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentBookings />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
