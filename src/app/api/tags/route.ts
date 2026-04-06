import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const tags = await prisma.tag.findMany({
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
  const body = await req.json();
  const { name, color } = body;

  if (!name?.trim()) {
    return Response.json({ error: "Tag name is required" }, { status: 400 });
  }

  const tag = await prisma.tag.upsert({
    where: { name: name.trim().toLowerCase() },
    create: { name: name.trim().toLowerCase(), color },
    update: { color },
  });

  return Response.json(tag, { status: 201 });
}
