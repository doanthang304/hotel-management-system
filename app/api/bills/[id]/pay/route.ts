import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({})); // Nhận body từ UI

  try {
    const bill = await prisma.bill.findUnique({
      where: { id: id, booking: { hotelId: session.user.hotelId } },
      include: { payments: true }
    });

    if (!bill) return NextResponse.json({ error: "Không tìm thấy hóa đơn" }, { status: 404 });
    if (bill.status === "SETTLED") return NextResponse.json({ error: "Hóa đơn đã thanh toán đủ" }, { status: 400 });

    // Lấy số tiền Lễ tân nhập, nếu không nhập thì mặc định là thu hết số nợ
    const amountToPay = body.amount !== undefined ? Number(body.amount) : Number(bill.amountDue);
    const method = body.method || "Tiền mặt";

    if (amountToPay > Number(bill.amountDue)) {
      return NextResponse.json({ error: "Số tiền thu không được lớn hơn công nợ" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let payment = null;
      // Chỉ tạo record lịch sử nếu thực sự có thu tiền (> 0)
      if (amountToPay > 0) {
        payment = await tx.billPayment.create({
          data: {
            billId: bill.id,
            recordedBy: session.user.id,
            amount: amountToPay,
            method: method,
            notes: "Thanh toán hóa đơn",
          }
        });
      }
      const newAmountDue = Number(bill.amountDue) - amountToPay;

      let newStatus = bill.status; // Mặc định giữ nguyên trạng thái cũ (OPEN)
      if (newAmountDue <= 0) {
        newStatus = "SETTLED";
      }

      const updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: {
          status: newStatus as any,
          amountDue: newAmountDue,
          finalizedAt: newAmountDue <= 0 ? new Date() : bill.finalizedAt,
          finalizedBy: newAmountDue <= 0 ? session.user.id : bill.finalizedBy,
        }
      });

      return { payment, updatedBill };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("POST /api/bills/[id]/pay error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}