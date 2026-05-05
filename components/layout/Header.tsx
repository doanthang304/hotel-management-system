"use client";

import { useState } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentPageTitle =
    Object.entries(pageTitles).find(([path]) =>
      path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(path)
    )?.[1] ?? "";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger
              nativeButton={true}
              render={<Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] md:hidden" />}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="truncate text-base font-semibold md:hidden">{currentPageTitle}</span>

          <div className="hidden items-center gap-2 md:flex">
            <Hotel className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">{hotelName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2" />
      </div>
    </header>
  );
}
