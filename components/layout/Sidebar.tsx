"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Users,
  Settings,
  ReceiptText,
  ClipboardList,
  PlusCircle,
  Building2,
  LogOut,
  Hotel,
  BarChart3
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  onNavigate?: () => void;
}

const mainNav = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/calendar", label: "Lịch phòng", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/rooms", label: "Phòng", icon: BedDouble },
  { href: "/guests", label: "Khách hàng", icon: Users },
  { href: "/bills", label: "Hóa đơn", icon: ReceiptText },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
];

const settingsNav = [
  { href: "/settings/hotel", label: "Thông tin khách sạn", icon: Building2 },
  { href: "/onboarding", label: "Thiết lập phòng", icon: Settings },
];

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className={cn("flex h-full flex-col border-r bg-background", className)}>
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <Hotel className="h-6 w-6 text-primary" />
        <span className="text-base font-semibold tracking-tight">Quản lý khách sạn</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-3 py-2">
          <Button
            className="mb-3 min-h-[44px] w-full justify-start gap-2"
            render={<Link href="/bookings/new" onClick={onNavigate} />}
            nativeButton={false}
          >
            <PlusCircle className="h-4 w-4" />
            Tạo booking mới
          </Button>

          <div className="space-y-0.5">
            {mainNav.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                variant={isActive(href) ? "secondary" : "ghost"}
                className={cn("min-h-[44px] w-full justify-start", isActive(href) && "font-medium")}
                render={<Link href={href} onClick={onNavigate} />}
                nativeButton={false}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-2 px-3 py-2">
          <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cài đặt
          </h2>
          <div className="space-y-0.5">
            {settingsNav.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                variant={isActive(href) ? "secondary" : "ghost"}
                className="min-h-[44px] w-full justify-start"
                render={<Link href={href} onClick={onNavigate} />}
                nativeButton={false}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Button>
            ))}

            <Button
              variant="ghost"
              className="mt-4 min-h-[44px] w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                onNavigate?.();
                signOut({ callbackUrl: "/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
