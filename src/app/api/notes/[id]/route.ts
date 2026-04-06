import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      conversation: {
        select: { id: true, title: true },
      },
    },
  });

  if (!note) {
    return Response.json({ error: "Note not found" }, { status: 404 });
  }

  return Response.json(note);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { title, content, summary, tagIds } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (content !== undefined) data.content = content;
  if (summary !== undefined) data.summary = summary;

  // Update tags if provided
  if (tagIds !== undefined) {
    // Delete existing tag relations, then create new ones
    await prisma.tagOnNote.deleteMany({ where: { noteId: id } });
    data.tags = {
      create: tagIds.map((tagId: string) => ({ tagId })),
    };
  }

  const note = await prisma.note.update({
    where: { id },
    data,
    include: {
      tags: { include: { tag: true } },
    },
  });

  return Response.json(note);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.note.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
