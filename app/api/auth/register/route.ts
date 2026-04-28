import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const RegisterSchema = z.object({
  hotelName: z.string().min(2, "Tên khách sạn tối thiểu 2 ký tự"),
  hotelAddress: z.string().optional(),
  hotelPhone: z.string().optional(),
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { hotelName, hotelAddress, hotelPhone, fullName, email, password } = parsed.data;

    // Check email đã tồn tại chưa
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email này đã được sử dụng" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Tạo hotel + owner trong transaction
    const result = await prisma.$transaction(async (tx) => {
      const hotel = await tx.hotel.create({
        data: {
          name: hotelName,
          address: hotelAddress,
          phone: hotelPhone,
        },
      });

      const user = await tx.user.create({
        data: {
          hotelId: hotel.id,
          fullName,
          email,
          passwordHash,
          role: "OWNER",
        },
      });

      return { hotel, user };
    });

    return NextResponse.json({
      message: "Đăng ký thành công",
      hotelId: result.hotel.id,
      userId: result.user.id,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
