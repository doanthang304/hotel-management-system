import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: [
      path.resolve(__dirname, "./__tests__/helpers/session-mock.ts"),
      path.resolve(__dirname, "./__tests__/helpers/prisma-mock.ts"),
    ],
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "prisma/**",
        "vitest.config.ts",
        "playwright.config.ts",
      ],
    },
  },
});
