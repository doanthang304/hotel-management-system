"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BedDouble,
  Users,
  ReceiptText,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNav = [
  { href: "/dashboard",   label: "Tổng quan",   icon: LayoutDashboard },
  { href: "/bookings",    label: "Bookings",    icon: ClipboardList },
  { href: "/rooms",       label: "Phòng",       icon: BedDouble },
  { href: "/bills",       label: "Hóa đơn",     icon: ReceiptText },
  { href: "/guests",      label: "Khách",       icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <nav className="bottom-nav">
      <div className="flex">
        {mobileNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn("bottom-nav-item", isActive(href) && "active")}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
