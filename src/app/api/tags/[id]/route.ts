import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/get-user";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const tag = await prisma.tag.findFirst({
    where: { id, userId },
    include: {
      notes: {
        include: {
          note: {
            select: { id: true, title: true, summary: true, updatedAt: true },
          },
        },
      },
      conversations: {
        include: {
          conversation: {
            select: { id: true, title: true, model: true, updatedAt: true },
          },
        },
      },
    },
  });

  if (!tag) {
    return Response.json({ error: "Tag not found" }, { status: 404 });
  }

  return Response.json({
    ...tag,
    notes: tag.notes.map((t) => t.note),
    conversations: tag.conversations.map((t) => t.conversation),
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  // Ensure user owns the tag
  const tag = await prisma.tag.findFirst({ where: { id, userId } });
  if (!tag) {
    return Response.json({ error: "Tag not found" }, { status: 404 });
  }

  await prisma.tag.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
