# Tiny HMS — Yêu cầu xây dựng sản phẩm hoàn chỉnh

> **Dành cho:** Cursor / Windsurf / Claude Code  
> **Mục tiêu:** Đọc xong prompt này, AI có đủ thông tin để build toàn bộ sản phẩm mà không cần hỏi thêm.

---

## 1. TỔNG QUAN SẢN PHẨM

Xây dựng **Tiny HMS** — nền tảng SaaS quản lý khách sạn nhỏ (mini hotel, nhà nghỉ, homestay, villa, 5–50 phòng).

**Mục tiêu cốt lõi:** Giúp chủ/nhân viên khách sạn tạo booking, quản lý booking và ghi nhận bill — thay thế hoàn toàn việc dùng Excel hoặc giấy tờ.

**Quan trọng:** Hệ thống KHÔNG tích hợp cổng thanh toán online. Mọi ghi nhận thu tiền đều do nhân viên nhập thủ công (số tiền, hình thức: tiền mặt / chuyển khoản / MoMo / ...).

---

## 2. TECH STACK

```
Frontend : Next.js 14 (App Router) + TypeScript
UI       : Tailwind CSS + shadcn/ui
Calendar : FullCalendar (@fullcalendar/react + @fullcalendar/resource-timeline)
Backend  : Supabase (PostgreSQL + Auth + Storage)
ORM      : Prisma (kết nối Supabase PostgreSQL)
Deploy   : Vercel
```

### Cài đặt dependencies chính
```bash
npx create-next-app@latest tiny-hms --typescript --tailwind --app
cd tiny-hms
npx shadcn@latest init
npx prisma init
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @fullcalendar/react @fullcalendar/resource-timeline @fullcalendar/interaction @fullcalendar/daygrid
npm install @tanstack/react-table
npm install react-hook-form @hookform/resolvers zod
npm install date-fns
npm install lucide-react
npm install recharts
npm install @react-pdf/renderer
```

---

## 3. DATABASE SCHEMA (Prisma)

Tạo file `prisma/schema.prisma` với nội dung đầy đủ sau:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Hotel {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name      String   @db.VarChar(200)
  address   String?
  phone     String?  @db.VarChar(20)
  email     String?  @db.VarChar(150)
  logoUrl   String?
  currency  String   @default("VND") @db.Char(3)
  timezone  String   @default("Asia/Ho_Chi_Minh")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users             User[]
  roomTypes         RoomType[]
  rooms             Room[]
  guests            Guest[]
  bookings          Booking[]
  serviceCatalog    ServiceCatalog[]
  housekeepingTasks HousekeepingTask[]
  auditLogs         AuditLog[]

  @@map("hotels")
}

model User {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hotelId      String    @db.Uuid
  fullName     String    @db.VarChar(150)
  email        String    @db.VarChar(150)
  passwordHash String
  role         UserRole  @default(RECEPTIONIST)
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  hotel              Hotel              @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  bookingsCreated    Booking[]          @relation("BookingCreatedBy")
  billsFinalized     Bill[]             @relation("BillFinalizedBy")
  billPayments       BillPayment[]
  bookingServices    BookingService[]
  housekeepingTasks  HousekeepingTask[]
  auditLogs          AuditLog[]

  @@unique([hotelId, email])
  @@map("users")
}

model RoomType {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hotelId      String   @db.Uuid
  name         String   @db.VarChar(100)
  description  String?
  maxOccupancy Int      @default(2) @db.SmallInt
  amenities    String[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  hotel      Hotel       @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  rooms      Room[]
  roomPrices RoomPrice[]

  @@unique([hotelId, name])
  @@map("room_types")
}

model RoomPrice {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  roomTypeId    String   @db.Uuid
  label         String   @db.VarChar(100)
  pricePerNight Decimal  @db.Decimal(12, 0)
  dateFrom      DateTime? @db.Date
  dateTo        DateTime? @db.Date
  isDefault     Boolean  @default(false)
  createdAt     DateTime @default(now())

  roomType RoomType @relation(fields: [roomTypeId], references: [id], onDelete: Cascade)

  @@map("room_prices")
}

model Room {
  id          String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hotelId     String     @db.Uuid
  roomTypeId  String     @db.Uuid
  roomNumber  String     @db.VarChar(20)
  floor       Int?       @db.SmallInt
  status      RoomStatus @default(AVAILABLE)
  notes       String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  hotel             Hotel              @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  roomType          RoomType           @relation(fields: [roomTypeId], references: [id])
  bookings          Booking[]
  housekeepingTasks HousekeepingTask[]

  @@unique([hotelId, roomNumber])
  @@map("rooms")
}

model Guest {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hotelId     String   @db.Uuid
  fullName    String   @db.VarChar(150)
  idNumber    String?  @db.VarChar(50)
  idType      IdType   @default(CCCD)
  idImageUrl  String?
  phone       String?  @db.VarChar(20)
  email       String?  @db.VarChar(150)
  nationality String?  @default("Việt Nam") @db.VarChar(100)
  address     String?
  dateOfBirth DateTime? @db.Date
  isVip       Boolean  @default(false)
  notes       String?
  totalStays  Int      @default(0)
  totalSpent  Decimal  @default(0) @db.Decimal(14, 0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  hotel    Hotel     @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  bookings Booking[]

  @@map("guests")
}

model Booking {
  id              String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hotelId         String        @db.Uuid
  roomId          String        @db.Uuid
  guestId         String        @db.Uuid
  createdBy       String        @db.Uuid
  bookingCode     String        @unique @db.VarChar(20)
  checkInDate     DateTime      @db.Date
  checkOutDate    DateTime      @db.Date
  numNights       Int           @db.SmallInt
  actualCheckIn   DateTime?
  actualCheckOut  DateTime?
  roomRate        Decimal       @db.Decimal(12, 0)
  depositAmount   Decimal       @default(0) @db.Decimal(12, 0)
  status          BookingStatus @default(PENDING)
  source          BookingSource @default(DIRECT)
  specialRequests String?
  internalNotes   String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  hotel           Hotel            @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  room            Room             @relation(fields: [roomId], references: [id])
  guest           Guest            @relation(fields: [guestId], references: [id])
  creator         User             @relation("BookingCreatedBy", fields: [createdBy], references: [id])
  bookingServices BookingService[]
  bill            Bill?
  housekeepingTasks HousekeepingTask[]

  @@map("bookings")
}

model ServiceCatalog {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hotelId     String   @db.Uuid
  name        String   @db.VarChar(150)
  unit        String   @default("lần") @db.VarChar(50)
  unitPrice   Decimal  @db.Decimal(12, 0)
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  hotel           Hotel            @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  bookingServices BookingService[]

  @@map("service_catalog")
}

model BookingService {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bookingId   String   @db.Uuid
  serviceId   String?  @db.Uuid
  serviceName String   @db.VarChar(150)
  quantity    Decimal  @db.Decimal(8, 2)
  unitPrice   Decimal  @db.Decimal(12, 0)
  subtotal    Decimal  @db.Decimal(14, 0)
  usedAt      DateTime @default(now())
  recordedBy  String?  @db.Uuid
  notes       String?

  booking  Booking         @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  service  ServiceCatalog? @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  recorder User?           @relation(fields: [recordedBy], references: [id], onDelete: SetNull)

  @@map("booking_services")
}

model Bill {
  id               String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bookingId        String     @unique @db.Uuid
  billNumber       String     @unique @db.VarChar(30)
  subtotalRoom     Decimal    @default(0) @db.Decimal(14, 0)
  subtotalServices Decimal    @default(0) @db.Decimal(14, 0)
  discountAmount   Decimal    @default(0) @db.Decimal(14, 0)
  discountNote     String?
  totalAmount      Decimal    @default(0) @db.Decimal(14, 0)
  depositApplied   Decimal    @default(0) @db.Decimal(14, 0)
  amountDue        Decimal    @default(0) @db.Decimal(14, 0)
  status           BillStatus @default(OPEN)
  notes            String?
  finalizedAt      DateTime?
  finalizedBy      String?    @db.Uuid
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  booking     Booking       @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  finalizer   User?         @relation("BillFinalizedBy", fields: [finalizedBy], references: [id], onDelete: SetNull)
  payments    BillPayment[]

  @@map("bills")
}

model BillPayment {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  billId      String   @db.Uuid
  recordedBy  String   @db.Uuid
  amount      Decimal  @db.Decimal(14, 0)
  method      String   @default("Tiền mặt") @db.VarChar(100)
  receivedAt  DateTime @default(now())
  notes       String?

  bill     Bill @relation(fields: [billId], references: [id], onDelete: Cascade)
  recorder User @relation(fields: [recordedBy], references: [id])

  @@map("bill_payments")
}

model HousekeepingTask {
  id          String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hotelId     String              @db.Uuid
  roomId      String              @db.Uuid
  bookingId   String?             @db.Uuid
  assignedTo  String?             @db.Uuid
  status      HousekeepingStatus  @default(PENDING)
  priority    Int                 @default(1) @db.SmallInt
  notes       String?
  scheduledAt DateTime?
  completedAt DateTime?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  hotel    Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  room     Room     @relation(fields: [roomId], references: [id])
  booking  Booking? @relation(fields: [bookingId], references: [id], onDelete: SetNull)
  assignee User?    @relation(fields: [assignedTo], references: [id], onDelete: SetNull)

  @@map("housekeeping_tasks")
}

model AuditLog {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hotelId    String   @db.Uuid
  userId     String?  @db.Uuid
  entityType String   @db.VarChar(50)
  entityId   String?  @db.Uuid
  action     String   @db.VarChar(50)
  oldValues  Json?
  newValues  Json?
  createdAt  DateTime @default(now())

  hotel Hotel @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  user  User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("audit_logs")
}

enum UserRole {
  OWNER
  MANAGER
  RECEPTIONIST
  HOUSEKEEPER
}

enum RoomStatus {
  AVAILABLE
  OCCUPIED
  CLEANING
  MAINTENANCE
  BLOCKED
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CHECKED_IN
  CHECKED_OUT
  CANCELLED
  NO_SHOW
}

enum BookingSource {
  DIRECT
  PHONE
  WALKIN
  BOOKING_COM
  AGODA
  AIRBNB
  OTHER
}

enum IdType {
  CCCD
  PASSPORT
  DRIVER_LICENSE
  OTHER
}

enum BillStatus {
  OPEN
  FINALIZED
  SETTLED
}

enum HousekeepingStatus {
  PENDING
  IN_PROGRESS
  DONE
  SKIPPED
}
```

---

## 4. CẤU TRÚC THƯ MỤC

```
tiny-hms/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  ← Sidebar + Header chung
│   │   ├── dashboard/page.tsx          ← Trang chủ: bảng phòng + thống kê nhanh
│   │   ├── bookings/
│   │   │   ├── page.tsx                ← Danh sách booking (DataTable)
│   │   │   ├── new/page.tsx            ← Tạo booking mới
│   │   │   └── [id]/page.tsx           ← Chi tiết / sửa booking
│   │   ├── calendar/page.tsx           ← Lịch booking (FullCalendar timeline)
│   │   ├── rooms/
│   │   │   ├── page.tsx                ← Danh sách phòng + trạng thái
│   │   │   └── settings/page.tsx       ← Quản lý hạng phòng + giá
│   │   ├── guests/
│   │   │   ├── page.tsx                ← Danh sách khách hàng
│   │   │   └── [id]/page.tsx           ← Hồ sơ khách + lịch sử
│   │   ├── services/page.tsx           ← Quản lý danh mục dịch vụ
│   │   ├── bills/
│   │   │   ├── page.tsx                ← Danh sách bill
│   │   │   └── [id]/page.tsx           ← Chi tiết bill + ghi nhận thu tiền
│   │   ├── housekeeping/page.tsx       ← Danh sách task dọn phòng
│   │   └── reports/page.tsx            ← Báo cáo doanh thu + công suất
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── bookings/
│   │   │   ├── route.ts                ← GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts            ← GET, PUT, DELETE
│   │   │       ├── checkin/route.ts
│   │   │       ├── checkout/route.ts
│   │   │       └── services/route.ts
│   │   ├── rooms/route.ts
│   │   ├── guests/route.ts
│   │   ├── bills/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── finalize/route.ts
│   │   │       └── payments/route.ts
│   │   ├── services/route.ts
│   │   ├── housekeeping/route.ts
│   │   └── reports/route.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                             ← shadcn/ui components (auto-generated)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MobileSidebar.tsx
│   ├── dashboard/
│   │   ├── RoomStatusGrid.tsx          ← Lưới trạng thái phòng
│   │   ├── StatsCards.tsx              ← Thẻ thống kê nhanh
│   │   └── RecentBookings.tsx
│   ├── bookings/
│   │   ├── BookingForm.tsx             ← Form tạo/sửa booking
│   │   ├── BookingTable.tsx            ← DataTable danh sách
│   │   ├── BookingStatusBadge.tsx
│   │   └── AddServiceDialog.tsx        ← Dialog thêm dịch vụ
│   ├── calendar/
│   │   └── BookingCalendar.tsx         ← FullCalendar timeline wrapper
│   ├── bills/
│   │   ├── BillSummary.tsx             ← Tổng hợp bill
│   │   ├── BillDetail.tsx
│   │   └── AddPaymentDialog.tsx        ← Dialog ghi nhận thu tiền
│   ├── guests/
│   │   ├── GuestForm.tsx
│   │   └── GuestHistory.tsx
│   └── reports/
│       ├── RevenueChart.tsx            ← Recharts bar chart
│       └── OccupancyChart.tsx
├── lib/
│   ├── prisma.ts                       ← Prisma client singleton
│   ├── supabase.ts                     ← Supabase client
│   ├── auth.ts                         ← NextAuth config
│   ├── utils.ts                        ← cn(), formatCurrency(), formatDate()
│   └── booking-code.ts                 ← Generator mã booking
├── hooks/
│   ├── useHotel.ts
│   ├── useBookings.ts
│   └── useRooms.ts
├── types/
│   └── index.ts                        ← TypeScript types từ Prisma
├── prisma/
│   └── schema.prisma
├── .env.local
└── middleware.ts                       ← Auth guard route protection
```

---

## 5. THIẾT KẾ GIAO DIỆN

### Design System
- **Màu chủ đạo:** Slate dark (`#0F172A` bg, `#1E293B` card) — tone chuyên nghiệp tối giản
- **Accent:** Indigo `#6366F1` cho CTA, teal `#14B8A6` cho trạng thái tích cực
- **Font:** `Geist` (Next.js mặc định) — sạch, hiện đại
- **Border radius:** `rounded-lg` (8px) nhất quán toàn app
- **Chế độ:** Hỗ trợ cả light và dark mode (Tailwind `dark:`)

### Màu trạng thái phòng (dùng nhất quán)
```
AVAILABLE   → green-500  (bg-green-500/10  text-green-400  border-green-500/20)
OCCUPIED    → blue-500   (bg-blue-500/10   text-blue-400   border-blue-500/20)
CLEANING    → yellow-500 (bg-yellow-500/10 text-yellow-400 border-yellow-500/20)
MAINTENANCE → red-500    (bg-red-500/10    text-red-400    border-red-500/20)
BLOCKED     → gray-500   (bg-gray-500/10   text-gray-400   border-gray-500/20)
```

### Màu trạng thái booking
```
PENDING     → yellow  CONFIRMED → blue
CHECKED_IN  → green   CHECKED_OUT → gray
CANCELLED   → red     NO_SHOW → orange
```

---

## 6. CHI TIẾT TỪNG TRANG

### 6.1 Trang Login / Register
- Form đăng nhập email + password
- Register: nhập thông tin khách sạn (tên, địa chỉ, SĐT) + tạo tài khoản owner
- Sau register: redirect thẳng vào onboarding wizard

### 6.2 Onboarding Wizard (3 bước — chỉ hiện lần đầu)
**Bước 1: Hạng phòng**
- Thêm các hạng phòng (ít nhất 1). Mỗi hạng: tên, mô tả, sức chứa, tiện nghi, giá thường, giá cuối tuần
  
**Bước 2: Phòng**
- Thêm các phòng vật lý: mã phòng, tầng, chọn hạng phòng

**Bước 3: Dịch vụ**
- Thêm danh mục dịch vụ: tên, đơn vị tính, đơn giá
- Có nút "Thêm nhanh" với các dịch vụ phổ biến (Ăn sáng, Giặt ủi, Đưa đón, Nước suối)

### 6.3 Dashboard (trang chủ)
Layout 3 phần:
1. **Stats row:** Tổng phòng đang ở / Phòng trống / Check-in hôm nay / Check-out hôm nay (4 thẻ)
2. **Room Status Grid:** Lưới hiển thị TẤT CẢ phòng dạng card. Mỗi card: mã phòng, hạng, trạng thái (màu), tên khách đang ở + ngày CO (nếu OCCUPIED). Click vào card → drawer chi tiết + shortcut check-in/check-out
3. **Sidebar phải:** Danh sách check-in hôm nay + check-out hôm nay

### 6.4 Trang Lịch phòng (Calendar)
- Dùng **FullCalendar Resource Timeline** view
- Trục Y = danh sách phòng (groupBy room_type)
- Trục X = ngày (default: tuần hiện tại, có nút tuần/tháng)
- Mỗi booking = 1 block màu nằm ngang, hiển thị tên khách
- Click block → popup chi tiết booking
- Click ô trống → mở form tạo booking mới (pre-fill phòng + ngày)
- Drag block để thay đổi ngày (nếu booking chưa check-in)

### 6.5 Trang Danh sách Booking
- DataTable (TanStack Table) với cột: Mã booking, Khách, Phòng, Check-in, Check-out, Số đêm, Tổng tiền, Trạng thái, Thao tác
- Filter: theo trạng thái, theo khoảng ngày, tìm kiếm tên khách / mã phòng
- Sort: theo ngày check-in (default DESC)
- Nút "Tạo booking mới" → mở form

### 6.6 Form Tạo / Sửa Booking
Dùng `react-hook-form` + `zod`. Layout 2 cột:

**Cột trái — Thông tin phòng:**
- Chọn phòng: dropdown hiển thị phòng trống trong khoảng ngày CI/CO đã chọn
- Check-in date / Check-out date (DatePicker)
- Số đêm (tính tự động)
- Giá phòng/đêm (auto-fill theo giá default của hạng phòng, có thể override)
- Tiền cọc
- Nguồn đặt phòng (BookingSource)
- Yêu cầu đặc biệt

**Cột phải — Thông tin khách:**
- Tìm kiếm khách cũ theo tên / SĐT (autocomplete)
- Nếu khách mới: form nhập Họ tên, CCCD/Passport, SĐT, Email, Quốc tịch
- Toggle VIP

**Footer:**
- Preview tổng tiền tạm tính (giá × số đêm)
- Nút "Lưu booking"

**Validation:**
- Check-out > Check-in
- Phòng không bị trùng trong khoảng thời gian
- Họ tên + SĐT khách bắt buộc

### 6.7 Trang Chi tiết Booking
Layout tab:

**Tab "Thông tin":** Xem/sửa toàn bộ thông tin booking. Action buttons theo trạng thái:
- PENDING/CONFIRMED → nút "Check-in"
- CHECKED_IN → nút "Thêm dịch vụ" + nút "Check-out"
- CHECKED_OUT → chỉ xem

**Tab "Dịch vụ":** Bảng dịch vụ đã sử dụng. Nút "Thêm dịch vụ" → dialog chọn từ catalog, nhập số lượng. Có thể xoá dòng dịch vụ.

**Tab "Bill":** Hiển thị BillSummary (xem mục 6.10). Nút "Chốt bill" / "Ghi nhận thu tiền".

**Timeline bên phải:** Lịch sử thay đổi trạng thái booking (từ audit_logs).

### 6.8 Trang Khách hàng
- DataTable: Họ tên, SĐT, Quốc tịch, VIP, Số lần ở, Tổng chi tiêu
- Click vào khách → trang hồ sơ: thông tin cá nhân + bảng lịch sử booking của khách đó

### 6.9 Trang Quản lý Phòng
**Tab "Phòng":** Danh sách phòng dạng bảng. Thêm/sửa/xoá phòng. Thay đổi trạng thái nhanh.

**Tab "Hạng phòng & Giá":** Accordion từng hạng phòng. Mỗi hạng xổ ra: thông tin + bảng giá (thêm/sửa/xoá mức giá).

### 6.10 Trang Bill (Chi tiết)
```
┌─────────────────────────────────────────┐
│  BILL #BILL-2024-0042                   │
│  Booking: BK20240427-001                │
├─────────────────────────────────────────┤
│  Tiền phòng:  3 đêm × 900,000đ         │
│               = 2,700,000đ             │
├─────────────────────────────────────────┤
│  Dịch vụ:                               │
│  · Ăn sáng × 2 người × 2 ngày = 320k  │
│  · Giặt ủi 2kg = 50k                   │
│               = 370,000đ               │
├─────────────────────────────────────────┤
│  Giảm giá:   -200,000đ  (KH thân thiết)│
│  Tiền cọc đã thu: -500,000đ            │
├─────────────────────────────────────────┤
│  TỔNG PHẢI THU: 2,370,000đ            │
├─────────────────────────────────────────┤
│  Lịch sử thu tiền:                      │
│  · 27/04 - Tiền mặt: 1,000,000đ       │
│  · 27/04 - CK VCB: 1,370,000đ         │
│  ĐÃ THU: 2,370,000đ ✓                  │
└─────────────────────────────────────────┘
```
- Nút "Ghi nhận thu tiền" → dialog: nhập số tiền + hình thức (text tự do)
- Nút "Xuất PDF" → render PDF bằng `@react-pdf/renderer`
- Tự động cập nhật `bill.status` → SETTLED khi `paid_total >= amount_due`

### 6.11 Trang Báo cáo
- **Doanh thu theo ngày/tuần/tháng:** Bar chart (Recharts) — dữ liệu từ `bill_payments`
- **Công suất phòng:** Line chart % theo tháng
- **Top dịch vụ:** Horizontal bar chart doanh thu theo từng dịch vụ
- **Bảng tóm tắt:** Tổng booking, tổng đêm phòng, doanh thu, trung bình/đêm

### 6.12 Trang Housekeeping
- Danh sách task dọn phòng: Phòng, Loại task, Trạng thái, Ưu tiên, Người phụ trách
- Nút cập nhật trạng thái: Pending → In Progress → Done
- Task `CHECKOUT_CLEAN` tự động tạo khi booking chuyển sang `CHECKED_OUT`

---

## 7. BUSINESS LOGIC QUAN TRỌNG

### 7.1 Tạo mã booking tự động
```typescript
// lib/booking-code.ts
export async function generateBookingCode(hotelId: string): Promise<string> {
  const today = new Date()
  const dateStr = format(today, 'yyyyMMdd')
  const count = await prisma.booking.count({
    where: {
      hotelId,
      createdAt: { gte: startOfDay(today), lte: endOfDay(today) }
    }
  })
  return `BK${dateStr}-${String(count + 1).padStart(3, '0')}`
}
```

### 7.2 Kiểm tra phòng trống (tránh double-booking)
```typescript
async function checkRoomAvailability(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const conflict = await prisma.booking.findFirst({
    where: {
      roomId,
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      AND: [
        { checkInDate: { lt: checkOut } },
        { checkOutDate: { gt: checkIn } }
      ]
    }
  })
  return !conflict
}
```

### 7.3 Tính và cập nhật bill
```typescript
async function recalculateBill(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { bookingServices: true, bill: true }
  })
  if (!booking) return

  const subtotalRoom = Number(booking.roomRate) * booking.numNights
  const subtotalServices = booking.bookingServices.reduce(
    (sum, s) => sum + Number(s.subtotal), 0
  )
  const discountAmount = Number(booking.bill?.discountAmount ?? 0)
  const depositApplied = Number(booking.depositAmount)
  const totalAmount = subtotalRoom + subtotalServices - discountAmount
  const amountDue = totalAmount - depositApplied

  await prisma.bill.upsert({
    where: { bookingId },
    create: {
      bookingId,
      billNumber: await generateBillNumber(),
      subtotalRoom, subtotalServices, discountAmount,
      totalAmount, depositApplied, amountDue,
      status: 'OPEN'
    },
    update: {
      subtotalRoom, subtotalServices, totalAmount, depositApplied, amountDue
    }
  })
}
```

### 7.4 Check-in flow
```typescript
async function checkIn(bookingId: string, userId: string) {
  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CHECKED_IN', actualCheckIn: new Date() }
    }),
    prisma.room.update({
      where: { id: booking.roomId },
      data: { status: 'OCCUPIED' }
    }),
    prisma.auditLog.create({
      data: { hotelId, userId, entityType: 'booking',
              entityId: bookingId, action: 'checkin' }
    })
  ])
}
```

### 7.5 Check-out flow
```typescript
async function checkOut(bookingId: string, userId: string) {
  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CHECKED_OUT', actualCheckOut: new Date() }
    }),
    prisma.room.update({
      where: { id: booking.roomId },
      data: { status: 'CLEANING' }  // Không tự về AVAILABLE, chờ dọn xong
    }),
    // Tự động tạo task dọn phòng
    prisma.housekeepingTask.create({
      data: {
        hotelId, roomId: booking.roomId, bookingId,
        status: 'PENDING', priority: 3,
        notes: `Dọn phòng sau checkout - Booking ${booking.bookingCode}`
      }
    }),
    // Chốt bill
    prisma.bill.update({
      where: { bookingId },
      data: { status: 'FINALIZED', finalizedAt: new Date(), finalizedBy: userId }
    }),
    // Cập nhật stats khách hàng
    prisma.guest.update({
      where: { id: booking.guestId },
      data: {
        totalStays: { increment: 1 },
        totalSpent: { increment: bill.totalAmount }
      }
    }),
    prisma.auditLog.create({
      data: { hotelId, userId, entityType: 'booking',
              entityId: bookingId, action: 'checkout' }
    })
  ])
}
```

### 7.6 Ghi nhận thu tiền & tự động cập nhật trạng thái bill
```typescript
async function recordPayment(billId: string, amount: number, method: string, userId: string) {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { payments: true }
  })
  const paidTotal = bill.payments.reduce((s, p) => s + Number(p.amount), 0) + amount

  await prisma.$transaction([
    prisma.billPayment.create({
      data: { billId, recordedBy: userId, amount, method }
    }),
    prisma.bill.update({
      where: { id: billId },
      data: {
        status: paidTotal >= Number(bill.amountDue) ? 'SETTLED' : 'FINALIZED'
      }
    })
  ])
}
```

---

## 8. API ROUTES

### Bookings
```
GET    /api/bookings              ← Danh sách (filter: status, dateFrom, dateTo, search)
POST   /api/bookings              ← Tạo booking mới
GET    /api/bookings/:id          ← Chi tiết booking
PUT    /api/bookings/:id          ← Sửa booking
DELETE /api/bookings/:id          ← Huỷ booking (soft: status = CANCELLED)
POST   /api/bookings/:id/checkin  ← Check-in
POST   /api/bookings/:id/checkout ← Check-out
GET    /api/bookings/:id/services ← Danh sách dịch vụ của booking
POST   /api/bookings/:id/services ← Thêm dịch vụ
DELETE /api/bookings/:id/services/:serviceId
```

### Bills
```
GET    /api/bills/:id             ← Chi tiết bill (include payments)
POST   /api/bills/:id/finalize    ← Chốt bill
POST   /api/bills/:id/payments    ← Ghi nhận thu tiền
DELETE /api/bills/:id/payments/:paymentId
```

### Rooms & Calendar
```
GET /api/rooms                    ← Danh sách phòng (filter: status)
GET /api/rooms/available          ← Phòng trống trong khoảng ngày (?from=&to=)
GET /api/calendar                 ← Dữ liệu cho FullCalendar (?from=&to=)
```

### Reports
```
GET /api/reports/revenue          ← (?period=day|week|month&from=&to=)
GET /api/reports/occupancy        ← (?from=&to=)
GET /api/reports/services         ← Top dịch vụ
```

---

## 9. MIDDLEWARE & BẢO MẬT

```typescript
// middleware.ts
export default withAuth(function middleware(req) {
  const { pathname } = req.nextUrl
  const token = req.nextauth.token

  // Redirect login nếu chưa auth
  if (!token && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Phân quyền theo role
  const role = token?.role as UserRole
  if (pathname.startsWith('/reports') && role === 'HOUSEKEEPER') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
}, { pages: { signIn: '/login' } })
```

**Quy tắc phân quyền:**
```
OWNER       : Full access
MANAGER     : Tất cả trừ quản lý users
RECEPTIONIST: Booking, Guests, Bills, Calendar, Dashboard
HOUSEKEEPER : Dashboard (room status) + Housekeeping tasks
```

---

## 10. BIẾN MÔI TRƯỜNG

```env
# .env.local
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
SUPABASE_SERVICE_ROLE_KEY="xxx"
```

---

## 11. THỨ TỰ BUILD (QUAN TRỌNG)

Build theo thứ tự này để luôn có thứ chạy được để test:

```
1.  Setup project + install dependencies
2.  Prisma schema + migrate + seed data
3.  Auth (login/register/middleware)
4.  Layout chung (Sidebar, Header)
5.  Onboarding wizard (room types, rooms, services)
6.  Dashboard (room status grid + stats)
7.  Tạo booking (form + validation + double-booking check)
8.  Danh sách booking (DataTable + filter)
9.  Calendar view (FullCalendar)
10. Check-in / Check-out flow
11. Dịch vụ thêm trong booking
12. Bill & ghi nhận thu tiền
13. Quản lý khách hàng (CRM nhẹ)
14. Housekeeping tasks
15. Báo cáo (charts)
16. Xuất PDF bill
17. Polish UI + responsive mobile
18. Deploy Vercel
```

---

## 12. SEED DATA MẪU

Tạo file `prisma/seed.ts` với dữ liệu:
- 1 khách sạn: "Khách sạn Hoa Mai"
- 2 users: owner + receptionist
- 2 hạng phòng: Standard (500k/đêm), Premium (900k/đêm)
- 4 phòng: P201, P301 (Standard), P202, P302 (Premium)
- 7 dịch vụ: Ăn sáng, Giặt ủi, Đưa đón, Xe máy, Nước suối, Bia lon, In tài liệu
- 3 booking mẫu ở các trạng thái khác nhau để dễ demo

---

## 13. YÊU CẦU KỸ THUẬT BỔ SUNG

- **Responsive:** Tất cả trang phải dùng được trên mobile (tablet tối thiểu). Sidebar collapse thành bottom nav trên mobile.
- **Loading states:** Dùng `loading.tsx` của Next.js + skeleton components cho mọi trang.
- **Error handling:** Mọi API route đều có try-catch + trả về error message rõ ràng.
- **Toast notifications:** Dùng `sonner` (shadcn built-in) cho mọi action thành công/thất bại.
- **Optimistic updates:** Form submit không block UI, update ngay rồi rollback nếu lỗi.
- **Currency format:** Mọi số tiền format theo VND: `1,500,000 đ` — tạo helper `formatVND(amount: number)`.
- **Date format:** Dùng `date-fns` với locale vi: `dd/MM/yyyy`.
- **Multi-tenant isolation:** Mọi query phải filter theo `hotelId` từ session — KHÔNG bao giờ query không có `hotelId`.
```

---

> **Lưu ý khi dùng prompt này:** Paste toàn bộ nội dung vào Cursor/Windsurf dưới dạng file `PRODUCT_SPEC.md`, sau đó dùng lệnh: *"Đọc file PRODUCT_SPEC.md và bắt đầu build theo thứ tự trong mục 11. Bắt đầu từ bước 1."*
