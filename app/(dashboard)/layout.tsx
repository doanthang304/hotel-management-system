import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"; // 1. Import prisma

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // 2. Lấy thông tin khách sạn từ DB
  const hotel = await prisma.hotel.findUnique({
    where: { id: session.user.hotelId },
    select: { name: true }, // Chỉ lấy cột name cho nhẹ
  });

  return (
    <div className="flex min-h-screen flex-col">
      {/* 3. Truyền tên xuống component Header */}
      <Header hotelName={hotel?.name || "Tiny HMS"} />
      
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <Sidebar />
        </aside>
        <main className="flex w-full flex-col overflow-hidden py-6">
          {children}
        </main>
      </div>
    </div>
  );
}