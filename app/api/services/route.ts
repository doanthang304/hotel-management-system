import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const services = await prisma.serviceCatalog.findMany({
      where: { hotelId: session.user.hotelId },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ data: services });
  } catch (error) {
    console.error("GET /api/services error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
