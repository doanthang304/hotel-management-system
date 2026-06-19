import { test as setup } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

setup("authenticate", async ({ page }) => {
  // Go to login page
  await page.goto("/login");

  // Fill in login credentials
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || "admin@hotel.com");
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || "123456");

  // Submit form
  await page.click('button[type="submit"]');

  // Verify successful login by waiting for navigation to dashboard
  await page.waitForURL(/.*dashboard/);

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
});
