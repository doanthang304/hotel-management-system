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
  BarChart3,
  Brush,
  ShoppingBag,
  PlusCircle,
  Building2,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

const mainNav = [
  { href: "/dashboard",   label: "Tổng quan",   icon: LayoutDashboard },
  { href: "/calendar",    label: "Lịch phòng",  icon: CalendarDays },
  { href: "/bookings",    label: "Bookings",    icon: ClipboardList },
  { href: "/rooms",       label: "Phòng",       icon: BedDouble },
  { href: "/guests",      label: "Khách hàng",  icon: Users },
  { href: "/bills",       label: "Hóa đơn",     icon: ReceiptText },
  // { href: "/reports",     label: "Báo cáo",     icon: BarChart3 },
];

const settingsNav = [
  { href: "/settings/hotel", label: "Thông tin khách sạn", icon: Building2 },
  { href: "/onboarding",     label: "Thiết lập phòng",    icon: Settings },
  // { href: "/services",       label: "Dịch vụ",        icon: ShoppingBag },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className={cn("pb-12 border-r h-full", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-3 px-4 text-lg font-semibold tracking-tight">
            Quản lý khách sạn
          </h2>

          {/* ── New Booking CTA ── */}
          <Button
            className="w-full justify-start gap-2 mb-3"
            render={<Link href="/bookings/new" />}
            nativeButton={false}
          >
            <PlusCircle className="h-4 w-4" />
            Tạo booking mới
          </Button>

          {/* ── Main nav ── */}
          <div className="space-y-0.5">
            {mainNav.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                variant={isActive(href) ? "secondary" : "ghost"}
                className="w-full justify-start"
                render={<Link href={href} />}
                nativeButton={false}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Settings section ── */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cài đặt
          </h2>
          <div className="space-y-0.5">
            {settingsNav.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                variant={isActive(href) ? "secondary" : "ghost"}
                className="w-full justify-start"
                render={<Link href={href} />}
                nativeButton={false}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Button>
            ))}

            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 mt-4"
              onClick={() => signOut({ callbackUrl: "/login" })}
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
