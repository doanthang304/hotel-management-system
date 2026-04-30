"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, Hotel } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

interface HeaderProps {
  hotelName: string;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Tổng quan",
  "/calendar": "Lịch phòng",
  "/bookings": "Bookings",
  "/rooms": "Phòng",
  "/guests": "Khách hàng",
  "/bills": "Hóa đơn",
  "/settings": "Cài đặt",
  "/onboarding": "Thiết lập",
  "/services": "Dịch vụ",
};

export function Header({ hotelName }: HeaderProps) {
  const pathname = usePathname();

  const currentPageTitle =
    Object.entries(pageTitles).find(
      ([path]) => path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(path)
    )?.[1] ?? "";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          {/* Mobile: hamburger + page title */}
          <Sheet>
            <SheetTrigger
              nativeButton={true}
              render={
                <Button variant="ghost" size="icon" className="md:hidden min-h-[44px] min-w-[44px]" />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              {/* Truyền prop để Sidebar biết là đang hiển thị trong menu mobile */}
              <Sidebar />
            </SheetContent>
          </Sheet>
          <span className="md:hidden font-semibold text-base truncate">
            {currentPageTitle}
          </span>

          {/* Desktop: hotel name */}
          <div className="hidden md:flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">{hotelName}</span>
          </div>
        </div>

        {/* Phần bên phải hiện đã trống, bạn có thể để dành cho thông báo hoặc các icon khác sau này */}
        <div className="flex items-center gap-2">
          {/* Đã xóa menu Avatar tại đây */}
        </div>
      </div>
    </header>
  );
}