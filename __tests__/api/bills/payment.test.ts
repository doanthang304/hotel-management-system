import { NextRequest } from "next/server";
import { POST } from "@/app/api/bills/[id]/pay/route";
import { prismaMock } from "../../helpers/prisma-mock";
import { mockSession } from "../../helpers/session-mock";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("POST /api/bills/[id]/pay", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSession.reset();
  });

  it("should return 401 if unauthorized", async () => {
    mockSession.setSession(null);
    const req = new NextRequest("http://localhost/api/bills/bill-123/pay", {
      method: "POST",
      body: JSON.stringify({ amount: 100000 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "bill-123" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 if bill is not found", async () => {
    prismaMock.bill.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/bills/bill-123/pay", {
      method: "POST",
      body: JSON.stringify({ amount: 100000 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "bill-123" }) });
    expect(res.status).toBe(404);
  });

  it("should return 400 if bill is already SETTLED", async () => {
    prismaMock.bill.findUnique.mockResolvedValue({
      id: "bill-123",
      status: "SETTLED",
    } as any);
    const req = new NextRequest("http://localhost/api/bills/bill-123/pay", {
      method: "POST",
      body: JSON.stringify({ amount: 100000 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "bill-123" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Hóa đơn đã thanh toán đủ");
  });

  it("should return 400 if payment amount exceeds amountDue", async () => {
    prismaMock.bill.findUnique.mockResolvedValue({
      id: "bill-123",
      status: "OPEN",
      amountDue: 500000,
    } as any);
    const req = new NextRequest("http://localhost/api/bills/bill-123/pay", {
      method: "POST",
      body: JSON.stringify({ amount: 600000 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "bill-123" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Số tiền thu không được lớn hơn công nợ");
  });

  it("should record partial payment and keep bill OPEN", async () => {
    const mockBill = {
      id: "bill-123",
      status: "OPEN",
      amountDue: 500000,
      payments: [],
    };
    prismaMock.bill.findUnique.mockResolvedValue(mockBill as any);
    prismaMock.bill.update.mockResolvedValue({
      ...mockBill,
      amountDue: 200000,
    } as any);

    const req = new NextRequest("http://localhost/api/bills/bill-123/pay", {
      method: "POST",
      body: JSON.stringify({ amount: 300000, method: "Chuyển khoản" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "bill-123" }) });
    expect(res.status).toBe(200);

    // Verify transaction updates
    expect(prismaMock.bill.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "bill-123" },
      data: expect.objectContaining({
        status: "OPEN",
        amountDue: 200000,
      }),
    }));
  });

  it("should settle the bill when paid in full", async () => {
    const mockBill = {
      id: "bill-123",
      status: "OPEN",
      amountDue: 500000,
      payments: [],
    };
    prismaMock.bill.findUnique.mockResolvedValue(mockBill as any);
    prismaMock.bill.update.mockResolvedValue({
      ...mockBill,
      status: "SETTLED",
      amountDue: 0,
    } as any);

    const req = new NextRequest("http://localhost/api/bills/bill-123/pay", {
      method: "POST",
      body: JSON.stringify({ amount: 500000 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "bill-123" }) });
    expect(res.status).toBe(200);

    expect(prismaMock.bill.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "bill-123" },
      data: expect.objectContaining({
        status: "SETTLED",
        amountDue: 0,
      }),
    }));
  });
});
