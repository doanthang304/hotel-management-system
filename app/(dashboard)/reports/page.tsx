import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RevenueChart } from "@/components/reports/RevenueChart";

export default function ReportsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Báo cáo & Thống kê</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Doanh thu tháng này</CardTitle>
            <CardDescription>Biểu đồ doanh thu theo từng ngày trong tháng hiện tại.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Công suất phòng</CardTitle>
            <CardDescription>Tỷ lệ sử dụng phòng trong 30 ngày qua.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[350px]">
            <p className="text-muted-foreground italic">Tính năng đang được phát triển...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
