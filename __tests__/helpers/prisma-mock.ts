import { vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => {
  const mockBooking = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
  };

  const mockBill = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  };

  const mockRoom = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  };

  const mockGuest = {
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockAuditLog = {
    create: vi.fn(),
  };

  const mockBillPayment = {
    create: vi.fn(),
  };

  const mockBookingService = {
    create: vi.fn(),
    aggregate: vi.fn(),
  };

  const mockClient = {
    booking: mockBooking,
    bill: mockBill,
    room: mockRoom,
    guest: mockGuest,
    auditLog: mockAuditLog,
    billPayment: mockBillPayment,
    bookingService: mockBookingService,
    // For transactions, we can accept either a callback or mock it
    $transaction: vi.fn(async (callbackOrArray) => {
      if (typeof callbackOrArray === "function") {
        return callbackOrArray(mockClient);
      }
      return Promise.all(callbackOrArray); // Resolve array of promises
    }),
  };

  return {
    prisma: mockClient,
  };
});

// Re-export the typed prismaMock for easier access to mock definitions in tests
export const prismaMock = prisma as unknown as {
  booking: typeof prisma.booking & {
    findUnique: any;
    findFirst: any;
    create: any;
    update: any;
    delete: any;
    count: any;
    findMany: any;
    aggregate: any;
  };
  bill: typeof prisma.bill & {
    findUnique: any;
    upsert: any;
    update: any;
    create: any;
    findMany: any;
  };
  room: typeof prisma.room & {
    findUnique: any;
    findFirst: any;
    update: any;
  };
  guest: typeof prisma.guest & {
    create: any;
    update: any;
  };
  auditLog: typeof prisma.auditLog & {
    create: any;
  };
  billPayment: typeof prisma.billPayment & {
    create: any;
  };
  bookingService: typeof prisma.bookingService & {
    create: any;
    aggregate: any;
  };
  $transaction: any;
};
