import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/get-user";

export async function GET() {
  const userId = await getCurrentUserId();

  const tags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { notes: true, conversations: true },
      },
    },
  });

  return Response.json({ tags });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const { name, color } = body;

  if (!name?.trim()) {
    return Response.json({ error: "Tag name is required" }, { status: 400 });
  }

  const tag = await prisma.tag.upsert({
    where: { userId_name: { userId, name: name.trim().toLowerCase() } },
    create: { name: name.trim().toLowerCase(), userId, color },
    update: { color },
  });

  return Response.json(tag, { status: 201 });
}
