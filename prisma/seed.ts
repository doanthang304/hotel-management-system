/**
 * prisma/seed.ts
 * Chạy: npx prisma db seed
 * Tạo dữ liệu mẫu: 1 khách sạn, 2 users, 2 hạng phòng, 4 phòng, 7 dịch vụ, 3 bookings
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { format, addDays, subDays, startOfDay } from "date-fns";

// Use DIRECT_URL for seeding to bypass pooler issues
const connectionString = process.env.DIRECT_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Bắt đầu seed data...");

  // ─── 1. Khách sạn ────────────────────────────────────────
  const hotel = await prisma.hotel.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Khách sạn Hoa Mai",
      address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
      phone: "028 3823 4567",
      email: "info@hoamai.vn",
      currency: "VND",
      timezone: "Asia/Ho_Chi_Minh",
    },
  });
  console.log("✅ Khách sạn:", hotel.name);

  // ─── 2. Users ────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  const owner = await prisma.user.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      hotelId: hotel.id,
      fullName: "Nguyễn Văn Chủ",
      email: "owner@hoamai.vn",
      passwordHash,
      role: "OWNER",
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      hotelId: hotel.id,
      fullName: "Trần Thị Lễ Tân",
      email: "receptionist@hoamai.vn",
      passwordHash,
      role: "RECEPTIONIST",
    },
  });
  console.log("✅ Users:", owner.email, receptionist.email);

  // ─── 3. Hạng phòng ───────────────────────────────────────
  const standardType = await prisma.roomType.upsert({
    where: { id: "00000000-0000-0000-0000-000000000010" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      hotelId: hotel.id,
      name: "Standard",
      description: "Phòng tiêu chuẩn, đầy đủ tiện nghi cơ bản",
      maxOccupancy: 2,
      amenities: ["Điều hòa", "TV", "Wifi", "Nóng lạnh"],
    },
  });

  await prisma.roomPrice.upsert({
    where: { id: "00000000-0000-0000-0000-000000000020" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000020",
      roomTypeId: standardType.id,
      label: "Giá thường",
      pricePerNight: 500000,
      isDefault: true,
    },
  });

  const premiumType = await prisma.roomType.upsert({
    where: { id: "00000000-0000-0000-0000-000000000011" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000011",
      hotelId: hotel.id,
      name: "Premium",
      description: "Phòng cao cấp, view đẹp, minibar, bồn tắm",
      maxOccupancy: 3,
      amenities: ["Điều hòa", "TV", "Wifi", "Minibar", "Bồn tắm", "Ban công"],
    },
  });

  await prisma.roomPrice.upsert({
    where: { id: "00000000-0000-0000-0000-000000000021" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000021",
      roomTypeId: premiumType.id,
      label: "Giá thường",
      pricePerNight: 900000,
      isDefault: true,
    },
  });
  console.log("✅ Hạng phòng: Standard, Premium");

  // ─── 4. Phòng ────────────────────────────────────────────
  const rooms = [
    { id: "00000000-0000-0000-0000-000000000030", roomNumber: "P201", floor: 2, roomTypeId: standardType.id },
    { id: "00000000-0000-0000-0000-000000000031", roomNumber: "P301", floor: 3, roomTypeId: standardType.id },
    { id: "00000000-0000-0000-0000-000000000032", roomNumber: "P202", floor: 2, roomTypeId: premiumType.id },
    { id: "00000000-0000-0000-0000-000000000033", roomNumber: "P302", floor: 3, roomTypeId: premiumType.id },
  ];

  for (const r of rooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, hotelId: hotel.id, status: "AVAILABLE" },
    });
  }
  console.log("✅ Phòng: P201, P301, P202, P302");

  // ─── 5. Dịch vụ ──────────────────────────────────────────
  const services = [
    { id: "00000000-0000-0000-0000-000000000040", name: "Ăn sáng", unit: "người/ngày", unitPrice: 80000 },
    { id: "00000000-0000-0000-0000-000000000041", name: "Giặt ủi", unit: "kg", unitPrice: 25000 },
    { id: "00000000-0000-0000-0000-000000000042", name: "Đưa đón sân bay", unit: "lượt", unitPrice: 250000 },
    { id: "00000000-0000-0000-0000-000000000043", name: "Thuê xe máy", unit: "ngày", unitPrice: 150000 },
    { id: "00000000-0000-0000-0000-000000000044", name: "Nước suối", unit: "chai", unitPrice: 15000 },
    { id: "00000000-0000-0000-0000-000000000045", name: "Bia lon", unit: "lon", unitPrice: 25000 },
    { id: "00000000-0000-0000-0000-000000000046", name: "In tài liệu", unit: "trang", unitPrice: 3000 },
  ];

  for (const s of services) {
    await prisma.serviceCatalog.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, hotelId: hotel.id, isActive: true },
    });
  }
  console.log("✅ Dịch vụ: 7 dịch vụ");

  // ─── 6. Guests mẫu ───────────────────────────────────────
  const guest1 = await prisma.guest.upsert({
    where: { id: "00000000-0000-0000-0000-000000000050" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000050",
      hotelId: hotel.id,
      fullName: "Lê Văn An",
      phone: "0901234567",
      idNumber: "079123456789",
      idType: "CCCD",
      nationality: "Việt Nam",
      isVip: false,
    },
  });

  const guest2 = await prisma.guest.upsert({
    where: { id: "00000000-0000-0000-0000-000000000051" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000051",
      hotelId: hotel.id,
      fullName: "Phạm Thị Bình",
      phone: "0912345678",
      idNumber: "AB1234567",
      idType: "PASSPORT",
      nationality: "Việt Nam",
      isVip: true,
      totalStays: 5,
      totalSpent: 12500000,
    },
  });

  const guest3 = await prisma.guest.upsert({
    where: { id: "00000000-0000-0000-0000-000000000052" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000052",
      hotelId: hotel.id,
      fullName: "Trần Minh Cường",
      phone: "0923456789",
      idNumber: "079987654321",
      idType: "CCCD",
      nationality: "Việt Nam",
    },
  });
  console.log("✅ Khách hàng: 3 khách");

  // ─── 7. Bookings mẫu ─────────────────────────────────────
  const today = startOfDay(new Date());

  // Booking 1: CHECKED_IN (đang ở)
  const booking1 = await prisma.booking.upsert({
    where: { id: "00000000-0000-0000-0000-000000000060" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000060",
      hotelId: hotel.id,
      roomId: rooms[0].id, // P201
      guestId: guest1.id,
      createdBy: receptionist.id,
      bookingCode: `BK${format(today, "yyyyMMdd")}-001`,
      checkInDate: subDays(today, 1),
      checkOutDate: addDays(today, 2),
      numNights: 3,
      actualCheckIn: subDays(today, 1),
      roomRate: 500000,
      depositAmount: 500000,
      status: "CHECKED_IN",
      source: "DIRECT",
    },
  });

  await prisma.room.update({ where: { id: rooms[0].id }, data: { status: "OCCUPIED" } });

  // Booking 2: CONFIRMED (sắp đến)
  const booking2 = await prisma.booking.upsert({
    where: { id: "00000000-0000-0000-0000-000000000061" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000061",
      hotelId: hotel.id,
      roomId: rooms[2].id, // P202
      guestId: guest2.id,
      createdBy: owner.id,
      bookingCode: `BK${format(addDays(today, 1), "yyyyMMdd")}-001`,
      checkInDate: addDays(today, 1),
      checkOutDate: addDays(today, 4),
      numNights: 3,
      roomRate: 900000,
      depositAmount: 900000,
      status: "CONFIRMED",
      source: "PHONE",
      specialRequests: "Phòng tầng cao, không hút thuốc",
    },
  });

  // Booking 3: CHECKED_OUT (đã trả phòng)
  const booking3 = await prisma.booking.upsert({
    where: { id: "00000000-0000-0000-0000-000000000062" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000062",
      hotelId: hotel.id,
      roomId: rooms[1].id, // P301
      guestId: guest3.id,
      createdBy: receptionist.id,
      bookingCode: `BK${format(subDays(today, 5), "yyyyMMdd")}-001`,
      checkInDate: subDays(today, 5),
      checkOutDate: subDays(today, 2),
      numNights: 3,
      actualCheckIn: subDays(today, 5),
      actualCheckOut: subDays(today, 2),
      roomRate: 500000,
      depositAmount: 300000,
      status: "CHECKED_OUT",
      source: "WALKIN",
    },
  });
  console.log("✅ Bookings: 3 bookings mẫu");

  // Tạo bill cho booking 1 (đang ở)
  const bill1Count = await prisma.bill.count();
  await prisma.bill.upsert({
    where: { bookingId: booking1.id },
    update: {},
    create: {
      bookingId: booking1.id,
      billNumber: `BILL-${format(today, "yyyyMMdd")}-001`,
      subtotalRoom: 1500000,
      subtotalServices: 160000,
      discountAmount: 0,
      totalAmount: 1660000,
      depositApplied: 500000,
      amountDue: 1160000,
      status: "OPEN",
    },
  });

  // Tạo bill cho booking 3 (đã checkout - SETTLED)
  await prisma.bill.upsert({
    where: { bookingId: booking3.id },
    update: {},
    create: {
      bookingId: booking3.id,
      billNumber: `BILL-${format(subDays(today, 2), "yyyyMMdd")}-001`,
      subtotalRoom: 1500000,
      subtotalServices: 0,
      discountAmount: 0,
      totalAmount: 1500000,
      depositApplied: 300000,
      amountDue: 1200000,
      status: "SETTLED",
      finalizedAt: subDays(today, 2),
      finalizedBy: receptionist.id,
    },
  });

  console.log("✅ Bills: 2 bills");
  console.log("\n🎉 Seed hoàn tất!");
  console.log("─────────────────────────────");
  console.log("📧 Owner:        owner@hoamai.vn / password123");
  console.log("📧 Receptionist: receptionist@hoamai.vn / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
