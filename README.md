#HMS

Đây là một dự án nhỏ tôi tự code vì sở thích và để phục vụ mục đích cá nhân, học hỏi công nghệ mới, cũng như thử nghiệm quy trình quản lý một khách sạn quy mô nhỏ. Dự án không đặt nặng tính thương mại mà tập trung vào sự gọn nhẹ, tối ưu và trải nghiệm người dùng mượt mà.

```html
    <video src="\public\HMS-demo.mp4" width="100%" autoplay loop muted playsinline></video>
```

---

## Công nghệ sử dụng

Dự án được xây dựng với hệ sinh thái hiện đại:
* **Framework:** Next.js (với App Router)
* **Database & ORM:** PostgreSQL kết hợp với Prisma Client (tối ưu qua Supabase/Supavisor)
* **Xác thực:** NextAuth.js
* **Giao diện:** Tailwind CSS, Base UI, Lucide Icons

---

## Tính năng hiện có

Dự án có các tính năng cốt lõi sau:
* **Tổng quan (Dashboard):** Xem nhanh các phòng đang sử dụng, phòng trống và thống kê số lượt check-in/check-out trong ngày.
* **Lịch phòng (Calendar):** Quản lý trạng thái đặt phòng trên lịch trực quan.
* **Quản lý đặt phòng (Bookings):** Tạo, cập nhật, hủy và chuyển trạng thái (Check-in/Check-out) dễ dàng.
* **Hóa đơn & Dịch vụ:** Theo dõi công nợ, thanh toán và quản lý các dịch vụ đi kèm.
* **Cài đặt & Thiết lập:** Tùy chỉnh thông tin khách sạn và bảo mật cá nhân.
* * cập nhật xong tính năng Báo cáo doanh thu
  * Cập nhật xong tính năng tự động điền booking.

---

#Còn phát triển:

* **Báo cáo doanh thu theo tháng/quý/năm/ --- Đã update vào ngày 5/5/26
* **Tích hợp AI tự động thêm booking bằng cách paste nội dung mail booking của khách hàng

## Cài đặt và Chạy thử

Clone my repo:

1. **Clone repository:**
   ```bash
   git clone https://github.com/doanthang304/hotel-management-system
   cd hotel-management-system
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Cấu hình file .env:**
   Tạo một file `.env` ở thư mục gốc và điền các thông số:
   ```env
   DATABASE_URL="your-pooling-database-url"
   DIRECT_URL="your-direct-database-url"
   NEXTAUTH_SECRET="your-super-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

4. **Chạy Migration:**
   ```bash
   npx prisma db push
   ```

5. **Khởi động ứng dụng:**
   ```bash
   npm run dev
   ```
