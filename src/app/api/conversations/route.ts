import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_USER_ID = "default-user";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || "";

  const where = {
    userId: DEFAULT_USER_ID,
    isArchived: false,
    ...(search ? { title: { contains: search } } : {}),
  };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { messages: true } },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  return Response.json({ conversations, total, page, limit });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { model = "gpt-4o", title } = body;

  const conversation = await prisma.conversation.create({
    data: {
      userId: DEFAULT_USER_ID,
      model,
      title: title || null,
    },
  });

  return Response.json(conversation, { status: 201 });
}
