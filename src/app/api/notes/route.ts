import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_USER_ID = "default-user";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const tagId = searchParams.get("tagId");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = { userId: DEFAULT_USER_ID };

  if (tagId) {
    where.tags = { some: { tagId } };
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tags: { include: { tag: true } },
        conversation: { select: { id: true, title: true } },
      },
    }),
    prisma.note.count({ where }),
  ]);

  return Response.json({ notes, total, page, limit });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, content, summary, conversationId, tagIds = [] } = body;

  if (!title || !content) {
    return Response.json({ error: "title and content are required" }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: {
      title,
      content,
      summary,
      conversationId,
      userId: DEFAULT_USER_ID,
      tags: {
        create: tagIds.map((tagId: string) => ({ tagId })),
      },
    },
    include: {
      tags: { include: { tag: true } },
    },
  });

  return Response.json(note, { status: 201 });
}
