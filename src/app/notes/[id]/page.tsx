"use client";

import { useState, useEffect, use } from "react";
import { fetchNote } from "@/lib/api-client";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [note, setNote] = useState<{
    id: string;
    title: string;
    content: string;
    summary: string | null;
    tags: Array<{ tag: { id: string; name: string } }>;
    conversation: { id: string; title: string | null } | null;
    updatedAt: string;
  } | null>(null);

  useEffect(() => {
    fetchNote(id).then(setNote);
  }, [id]);

  if (!note) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/notes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold">{note.title}</h1>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {note.tags.map((t) => (
              <span
                key={t.tag.id}
                className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs"
              >
                {t.tag.name}
              </span>
            ))}
          </div>
        </div>
        {note.conversation && (
          <Link href={`/c/${note.conversation.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              原始对话
            </Button>
          </Link>
        )}
      </div>

      {note.summary && (
        <div className="mb-6 rounded-lg bg-muted/50 p-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">AI 摘要</p>
          <p className="text-sm">{note.summary}</p>
        </div>
      )}

      <div className="prose-container">
        <MarkdownRenderer content={note.content} />
      </div>
    </div>
  );
}
