"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  addYears,
  format,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Hotel,
  Loader2,
  Percent,
  PieChart as PieChartIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatVND } from "@/lib/utils";

type ReportPeriod = "week" | "month" | "year";

type ReportResponse = {
  meta: {
    period: ReportPeriod;
    from: string;
    to: string;
    totalDays: number;
    totalRooms: number;
  };
  metrics: {
    totalRevenue: number;
    totalBookings: number;
    settledBills: number;
    occupancyRate: number;
    averageRevenuePerRoom: number;
  };
  revenueTrend: Array<{
    key: string;
    label: string;
    fullLabel: string;
    revenue: number;
    bookings: number;
  }>;
  bookingSources: Array<{
    source: string;
    label: string;
    count: number;
    revenue: number;
  }>;
  roomPerformance: Array<{
    roomId: string;
    roomNumber: string;
    revenue: number;
    bookings: number;
    occupiedNights: number;
    occupancyRate: number;
  }>;
};

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0f766e", "#64748b", "#ec4899"];

function shiftReferenceDate(period: ReportPeriod, current: Date, direction: "prev" | "next") {
  if (period === "week") return direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1);
  if (period === "year") return direction === "prev" ? subYears(current, 1) : addYears(current, 1);
  return direction === "prev" ? subMonths(current, 1) : addMonths(current, 1);
}

function getRangeLabel(report: ReportResponse | null, referenceDate: Date, period: ReportPeriod) {
  if (report) {
    return `${format(new Date(report.meta.from), "dd/MM/yyyy")} - ${format(new Date(report.meta.to), "dd/MM/yyyy")}`;
  }

  if (period === "year") return `Năm ${format(referenceDate, "yyyy")}`;
  if (period === "week") return `Tuần của ${format(referenceDate, "dd/MM/yyyy")}`;
  return `Tháng ${format(referenceDate, "MM/yyyy")}`;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReportData() {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          period,
          date: referenceDate.toISOString(),
        });

        const res = await fetch(`/api/reports/revenue?${query.toString()}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "KhĂ´ng thá»ƒ táº£i bĂ¡o cĂ¡o");
        }

        setData(json.data as ReportResponse);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Lá»—i há»‡ thá»‘ng khi táº£i bĂ¡o cĂ¡o");
      } finally {
        setLoading(false);
      }
    }

    fetchReportData();
  }, [period, referenceDate]);

  const topRooms = useMemo(() => data?.roomPerformance.slice(0, 8) ?? [], [data]);
  const rangeLabel = useMemo(() => getRangeLabel(data, referenceDate, period), [data, period, referenceDate]);
  const totalSourceBookings = useMemo(
    () => data?.bookingSources.reduce((sum, item) => sum + item.count, 0) ?? 0,
    [data]
  );

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Báo cáo doanh thu</h2>
          <p className="text-muted-foreground">Xem doanh thu, hiệu suất phòng, tỉ lệ lấp đầy và nguồn đặt phòng theo tuần, tháng, năm.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={period} onValueChange={(value) => setPeriod(value as ReportPeriod)}>
            <TabsList>
              <TabsTrigger value="week">Tuần</TabsTrigger>
              <TabsTrigger value="month">Tháng</TabsTrigger>
              <TabsTrigger value="year">Năm</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => setReferenceDate((prev) => shiftReferenceDate(period, prev, "prev"))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger className="inline-flex min-w-[180px] items-center justify-start rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {rangeLabel}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={referenceDate} onSelect={(date) => date && setReferenceDate(date)} />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon-sm" onClick={() => setReferenceDate((prev) => shiftReferenceDate(period, prev, "next"))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[420px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          Không có dữ liệu báo cáo.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatVND(data.metrics.totalRevenue)}</div>
                <p className="mt-1 text-xs text-muted-foreground">{data.metrics.settledBills} hóa đơn đã thanh toán</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Doanh thu bình quân / phòng</CardTitle>
                <Hotel className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatVND(data.metrics.averageRevenuePerRoom)}</div>
                <p className="mt-1 text-xs text-muted-foreground">{data.meta.totalRooms} phòng trong kỳ báo cáo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tỉ lệ lấp đầy phòng</CardTitle>
                <Percent className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.metrics.occupancyRate}%</div>
                <p className="mt-1 text-xs text-muted-foreground">{data.meta.totalDays} ngày trong kỳ</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng booking hợp lệ</CardTitle>
                <PieChartIcon className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.metrics.totalBookings}</div>
                <p className="mt-1 text-xs text-muted-foreground">Không tính booking hủy hoặc no-show</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Doanh thu theo thời gian</CardTitle>
              <CardDescription>
                {period === "year"
                  ? "Doanh thu được gộp theo tháng trong năm đã chọn."
                  : "Doanh thu được hiển thị theo từng ngày trong kỳ đã chọn."}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueTrend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const bookings = Number(item.payload?.bookings || 0);
                      return [formatVND(Number(value) || 0), `${bookings} booking`];
                    }}
                    labelFormatter={(_, items) => items?.[0]?.payload?.fullLabel ?? ""}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Nguồn đặt phòng</CardTitle>
                <CardDescription>Phân bổ số booking và doanh thu theo từng kênh nhận khách.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <div className="h-[280px]">
                  {data.bookingSources.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Chưa có dữ liệu nguồn booking.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.bookingSources}
                          dataKey="count"
                          nameKey="label"
                          innerRadius={62}
                          outerRadius={94}
                          paddingAngle={2}
                        >
                          {data.bookingSources.map((entry, index) => (
                            <Cell key={entry.source} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, _name, item) => {
                            const revenue = Number(item.payload?.revenue || 0);
                            return [`${value} booking`, formatVND(revenue)];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="space-y-3">
                  {data.bookingSources.length === 0 ? (
                    <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                      Chưa có nguồn booking trong kỳ này.
                    </div>
                  ) : (
                    data.bookingSources.map((source, index) => {
                      const ratio = totalSourceBookings > 0 ? Math.round((source.count / totalSourceBookings) * 100) : 0;
                      return (
                        <div key={source.source} className="rounded-lg border p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                              />
                              <span className="font-medium">{source.label}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{ratio}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>{source.count} booking</span>
                            <span className="font-semibold">{formatVND(source.revenue)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Doanh thu theo phòng</CardTitle>
                <CardDescription>Top phòng có doanh thu cao nhất trong kỳ báo cáo.</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                {topRooms.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Chưa có dữ liệu doanh thu theo phòng.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topRooms} layout="vertical" margin={{ top: 0, right: 12, left: 12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.25} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="roomNumber"
                        axisLine={false}
                        tickLine={false}
                        fontSize={12}
                        width={48}
                      />
                      <Tooltip
                        formatter={(value, _name, item) => {
                          const occupancy = Number(item.payload?.occupancyRate || 0);
                          return [formatVND(Number(value) || 0), `Lấp đầy ${occupancy}%`];
                        }}
                        contentStyle={{ borderRadius: "8px" }}
                      />
                      <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hiệu suất từng phòng</CardTitle>
              <CardDescription>Doanh thu trên mỗi phòng, số đêm bán được, tỉ lệ lấp đầy và số booking theo kỳ đã chọn.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phòng</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">Số đêm</TableHead>
                    <TableHead className="text-right">Lấp đầy</TableHead>
                    <TableHead className="text-right">Booking</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.roomPerformance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Chưa có dữ liệu hiệu suất phòng.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.roomPerformance.map((room) => (
                      <TableRow key={room.roomId}>
                        <TableCell className="font-medium">Phòng {room.roomNumber}</TableCell>
                        <TableCell className="text-right">{formatVND(room.revenue)}</TableCell>
                        <TableCell className="text-right">{room.occupiedNights}</TableCell>
                        <TableCell className="text-right">{room.occupancyRate}%</TableCell>
                        <TableCell className="text-right">{room.bookings}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
