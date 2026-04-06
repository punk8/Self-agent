import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbInitialized: boolean | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "file:./data/self-agent.db";
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Ensure the default user exists. Called lazily on first API request.
 */
export async function ensureDefaultUser() {
  if (globalForPrisma.dbInitialized) return;

  try {
    const existing = await prisma.user.findUnique({
      where: { id: "default-user" },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          id: "default-user",
          email: "default@self-agent.local",
          name: "Default User",
        },
      });
    }

    globalForPrisma.dbInitialized = true;
  } catch {
    // Table might not exist yet if migrations haven't run
  }
}
