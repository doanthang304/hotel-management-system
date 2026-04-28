/**
 * lib/prisma.ts
 * Singleton PrismaClient for use in Next.js API routes and server components.
 *
 * - DATABASE_URL  → pooled connection (port 6543, pgBouncer/Supavisor) — used here at runtime
 * - DIRECT_URL    → direct connection (port 5432) — used only by Prisma CLI (prisma.config.ts)
 *
 * The singleton pattern prevents exhausting DB connections during hot-reload in development.
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
