---
name: "writing_automated_tests"
description: "Skills and patterns for writing unit tests using Vitest and E2E tests using Playwright in the hotel management system"
---

# Skill: Writing Automated Tests

Hướng dẫn này giúp AI Agent viết Unit Test và E2E Test chuẩn xác cho hệ thống quản lý khách sạn.

## Cấu trúc kiểm thử (Test Structure)

```
__tests__/
├── helpers/
│   ├── prisma-mock.ts          # Mock client Prisma
│   └── session-mock.ts         # Mock NextAuth session
├── lib/
│   └── *.test.ts               # Test cho helper functions
└── api/
    └── *.test.ts               # Test cho các API route handlers
e2e/
└── *.spec.ts                   # Playwright E2E tests
```

## Viết Unit Test cho Helper (`lib/`)

Các hàm pure utility hoặc helper nên được kiểm thử cô lập. Sử dụng `describe`, `it`, `expect` từ `vitest`.

### Ví dụ:
```typescript
import { describe, it, expect } from "vitest";
import { formatVND } from "@/lib/utils";

describe("formatVND", () => {
  it("should format money to VND", () => {
    expect(formatVND(100000)).toBe("100.000 đ");
  });
});
```

## Viết API Route Test (`app/api/`)

Khi viết API route test, hãy đảm bảo mock cả Prisma và NextAuth Session.

### 1. Mock database với `prismaMock`
`prismaMock` đã được cấu hình tự động. Bạn chỉ cần import và định nghĩa kết quả trả về bằng `.mockResolvedValue` hoặc `.mockRejectedValue`.

### 2. Mock auth với `mockSession`
- Để test quyền hợp lệ: `mockSession.reset()` (mặc định trả về session hợp lệ).
- Để test lỗi Unauthorized (401): `mockSession.setSession(null)`.

### Ví dụ Test checkin API:
```typescript
import { NextRequest } from "next/server";
import { POST } from "@/app/api/bookings/[id]/checkin/route";
import { prismaMock } from "../../helpers/prisma-mock";
import { mockSession } from "../../helpers/session-mock";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("POST /api/bookings/[id]/checkin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSession.reset();
  });

  it("should return 401 if not logged in", async () => {
    mockSession.setSession(null);
    const req = new NextRequest("http://localhost/api/bookings/1/checkin", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });
});
```

## Cách chạy test
- Chạy tất cả test: `npx vitest run`
- Chạy watch mode: `npx vitest`
- Xem độ bao phủ test (coverage): `npx vitest run --coverage`
