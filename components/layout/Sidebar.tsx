import Link from "next/link";
import { 
  LayoutDashboard, 
  CalendarDays, 
  BedDouble, 
  Users, 
  Settings, 
  ReceiptText,
  ClipboardList,
  BarChart3,
  Brush,
  ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  return (
    <div className={cn("pb-12 border-r h-full", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Tiny HMS
          </h2>
          <div className="space-y-1">
            <Button variant="secondary" className="w-full justify-start" render={<Link href="/dashboard" />}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Tổng quan
            </Button>
            <Button variant="ghost" className="w-full justify-start" render={<Link href="/calendar" />}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Lịch phòng
            </Button>
            <Button variant="ghost" className="w-full justify-start" render={<Link href="/bookings" />}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Bookings
            </Button>
            <Button variant="ghost" className="w-full justify-start" render={<Link href="/rooms" />}>
              <BedDouble className="mr-2 h-4 w-4" />
              Phòng
            </Button>
            <Button variant="ghost" className="w-full justify-start" render={<Link href="/guests" />}>
              <Users className="mr-2 h-4 w-4" />
              Khách hàng
            </Button>
            <Button variant="ghost" className="w-full justify-start" render={<Link href="/bills" />}>
              <ReceiptText className="mr-2 h-4 w-4" />
              Hóa đơn
            </Button>
            <Button variant="ghost" className="w-full justify-start" render={<Link href="/reports" />}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Báo cáo
            </Button>
            <Button variant="ghost" className="w-full justify-start" render={<Link href="/housekeeping" />}>
              <Brush className="mr-2 h-4 w-4" />
              Buồng phòng
            </Button>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Cài đặt
          </h2>
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start" render={<Link href="/rooms/settings" />}>
              <Settings className="mr-2 h-4 w-4" />
              Cài đặt phòng
            </Button>
            <Button variant="ghost" className="w-full justify-start" render={<Link href="/services" />}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Dịch vụ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
