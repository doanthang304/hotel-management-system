// Prisma v7 config — connection URLs are defined here, NOT in schema.prisma
// - url: DIRECT_URL (port 5432) — used by Prisma CLI for migrations & introspection
// - DATABASE_URL (pooler, port 6543) is passed to PrismaClient at runtime in lib/prisma.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI requires a direct (non-pooled) connection for migrations
    url: process.env["DIRECT_URL"],
  },
});
