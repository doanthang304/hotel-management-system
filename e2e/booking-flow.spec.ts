import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

test.use({ storageState: authFile });

test.describe("Hotel Booking Management Flow", () => {
  test("should navigate to bookings page and show new booking form", async ({ page }) => {
    // 1. Go to bookings list page
    await page.goto("/bookings");

    // 2. Verify page header
    const header = page.locator("h2");
    await expect(header).toContainText("Quản lý đặt phòng");

    // 3. Click the "Tạo booking" button
    await page.click('a:has-text("Tạo booking")');

    // 4. Verify we are redirected to the new booking page
    await page.waitForURL("**/bookings/new");
    const newBookingHeader = page.locator("h2");
    await expect(newBookingHeader).toContainText("Tạo đặt phòng mới");

    // 5. Verify basic booking form elements are present
    // Let's check for guest information inputs (e.g. full name, phone)
    await expect(page.locator("label:has-text('Họ tên')")).toBeVisible();
    await expect(page.locator("label:has-text('Số điện thoại')")).toBeVisible();
  });
});
