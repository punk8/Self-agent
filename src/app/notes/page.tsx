"use client";

import { useState, useEffect } from "react";
import { fetchNotes, fetchTags, deleteNote, exportConversationToNote, type NoteSummary, type TagWithCount } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FileText, Tag, Trash2, ExternalLink, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>();
  const [search, setSearch] = useState("");

  const loadData = async () => {
    const [notesData, tagsData] = await Promise.all([
      fetchNotes({ tagId: selectedTagId, search: search || undefined }),
      fetchTags(),
    ]);
    setNotes(notesData);
    setTags(tagsData);
  };

  useEffect(() => {
    loadData();
  }, [selectedTagId, search]);

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    loadData();
  };

  return (
    <div className="flex h-screen">
      {/* Tag sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-muted/30 md:block">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Tags</h3>
          <button
            onClick={() => setSelectedTagId(undefined)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
              !selectedTagId && "bg-accent font-medium"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            全部笔记
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTagId(tag.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                selectedTagId === tag.id && "bg-accent font-medium"
              )}
            >
              <Tag className="h-3.5 w-3.5" />
              <span className="flex-1 truncate text-left">{tag.name}</span>
              <span className="text-xs text-muted-foreground">{tag._count.notes}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Notes list */}
      <main className="flex-1 overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">笔记</h1>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索笔记..."
                className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-73px)]">
          <div className="p-4 space-y-3">
            {notes.length === 0 && (
              <p className="text-center py-12 text-muted-foreground">
                {search ? "没有找到匹配的笔记" : "暂无笔记，在对话中导出笔记开始使用"}
              </p>
            )}
            {notes.map((note) => (
              <div
                key={note.id}
                className="group rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/notes/${note.id}`} className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{note.title}</h3>
                    {note.summary && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{note.summary}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {note.tags.map((t) => (
                        <span
                          key={t.tag.id}
                          className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs"
                        >
                          {t.tag.name}
                        </span>
                      ))}
                      {note.conversation && (
                        <span className="text-xs text-muted-foreground">
                          来自: {note.conversation.title || "对话"}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {note.conversation && (
                      <Link href={`/c/${note.conversation.id}`}>
                        <Button size="icon" variant="ghost" title="查看原始对话">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(note.id)}
                      title="删除笔记"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
