import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { NoteContent } from "./note-content";

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      conversation: { select: { id: true, title: true } },
    },
  });

  if (!note) notFound();

  return (
    <NoteContent
      note={{
        id: note.id,
        title: note.title,
        content: note.content,
        summary: note.summary,
        updatedAt: note.updatedAt.toISOString(),
        tags: note.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
        conversationId: note.conversation?.id || null,
        conversationTitle: note.conversation?.title || null,
      }}
    />
  );
}
