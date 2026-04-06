import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./data/self-agent.db";
  const adapter = new PrismaLibSql({ url });
  const prisma = new PrismaClient({ adapter });

  // Create default user if not exists
  const existing = await prisma.user.findUnique({
    where: { email: "default@self-agent.local" },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        id: "default-user",
        email: "default@self-agent.local",
        name: "Default User",
      },
    });
    console.log("Created default user");
  } else {
    console.log("Default user already exists");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
