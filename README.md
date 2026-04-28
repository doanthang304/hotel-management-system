# Tiny HMS

Đây là hệ thống quản lý mini-hotel được xây dựng bằng Next.js (App Router), Prisma, PostgreSQL (Supabase) và Tailwind CSS.

## ⚠️ Bước quan trọng đầu tiên: Cấu hình Cơ sở dữ liệu

Dự án hiện đang dừng lại để chờ bạn cấu hình các biến môi trường kết nối tới **Supabase PostgreSQL**. Bạn cần thực hiện các thao tác sau:

1. **Lấy thông tin từ Supabase:**
   - Đăng nhập vào [Supabase](https://supabase.com).
   - Chọn Project của bạn -> Vào phần **Project Settings** -> **Database**.
   - Copy mục **Transaction pooler** (Session mode) hoặc **URI** cho biến `DATABASE_URL` (ví dụ: `postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`).
   - Copy mục **Session mode** / URI không pooler cho biến `DIRECT_URL` (ví dụ: `postgresql://...:5432/postgres`).
   - Copy `Project URL`, `anon key` và `service_role key` trong phần **API**.

2. **Cập nhật file `.env.local`:**
   Tạo mới (hoặc mở) file `.env.local` trong thư mục gốc của dự án (`hotel-manage-system`) và thêm nội dung sau. Bạn có thể tham khảo file `.env.example` vừa được sinh ra:

   ```env
   # PostgreSQL Connection (Supabase)
   DATABASE_URL="điền_url_database_vào_đây"
   DIRECT_URL="điền_url_database_trực_tiếp_vào_đây"

   # NextAuth
   NEXTAUTH_SECRET="điền_1_chuỗi_bảo_mật_bất_kỳ_vào_đây_ví_dụ_secret_hms_123"
   NEXTAUTH_URL="http://localhost:3000"

   # Supabase Keys (đã có SUPA_BASE_API, bạn có thể cấu hình thêm biến chuẩn)
   NEXT_PUBLIC_SUPABASE_URL="điền_project_url_vào_đây"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="điền_anon_key_vào_đây"
   ```

3. **Thông báo cho AI:**
   Sau khi bạn đã điền xong, hãy báo lại cho tôi: *"Tôi đã điền xong biến môi trường, hãy chạy migrate và tiếp tục Phase 2"*.

## Khởi động dự án cục bộ

Khi CSDL đã được thiết lập, chạy lệnh:
```bash
npm run dev
```

Project sẽ chạy tại [http://localhost:3000](http://localhost:3000).
