import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json(conversation);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { title, model, isArchived } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (model !== undefined) data.model = model;
  if (isArchived !== undefined) data.isArchived = isArchived;

  const conversation = await prisma.conversation.update({
    where: { id },
    data,
  });

  return Response.json(conversation);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.conversation.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
