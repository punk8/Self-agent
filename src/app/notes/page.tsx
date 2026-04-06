"use client";

import { useState, useEffect } from "react";
import { fetchNotes, fetchTags, deleteNote, type NoteSummary, type TagWithCount } from "@/lib/api-client";
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

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const [notesData, tagsData] = await Promise.all([
        fetchNotes({ tagId: selectedTagId, search: search || undefined }),
        fetchTags(),
      ]);

      if (!cancelled) {
        setNotes(notesData);
        setTags(tagsData);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedTagId, search]);

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    const [notesData, tagsData] = await Promise.all([
      fetchNotes({ tagId: selectedTagId, search: search || undefined }),
      fetchTags(),
    ]);
    setNotes(notesData);
    setTags(tagsData);
  };

  return (
    <div className="flex h-screen bg-transparent">
      {/* Tag sidebar */}
      <aside className="paper-panel hidden w-64 shrink-0 rounded-l-[2rem] border-r-0 md:block">
        <div className="p-5">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">Library</p>
          <h3 className="mb-4 font-display text-[2rem] leading-none">Tags</h3>
          <button
            onClick={() => setSelectedTagId(undefined)}
            className={cn(
              "mb-1 flex w-full items-center gap-2 rounded-[1.2rem] px-3 py-2.5 text-sm transition-colors hover:bg-accent/70",
              !selectedTagId && "paper-card font-medium"
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
              "mb-1 flex w-full items-center gap-2 rounded-[1.2rem] px-3 py-2.5 text-sm transition-colors hover:bg-accent/70",
              selectedTagId === tag.id && "paper-card font-medium"
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
      <main className="flex-1 overflow-hidden rounded-r-[2rem]">
        <div className="border-b border-border/70 p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="shrink-0">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Archive</p>
              <h1 className="font-display text-[2rem] leading-none">笔记</h1>
            </div>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索..."
                className="h-11 w-full rounded-full border border-input bg-background/70 pl-9 pr-4 text-sm shadow-[var(--paper-shadow-soft)] focus:outline-none focus:ring-2 focus:ring-ring/60"
              />
            </div>
          </div>
          {/* Mobile tag filter */}
          {tags.length > 0 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto md:hidden">
              <button
                onClick={() => setSelectedTagId(undefined)}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  !selectedTagId ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground"
                )}
              >
                全部
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTagId(tag.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    selectedTagId === tag.id ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground"
                  )}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <ScrollArea className="scrollbar-thin h-[calc(100vh-96px)]">
          <div className="p-4 md:p-6 space-y-4">
            {notes.length === 0 && (
              <div className="paper-card rounded-[1.8rem] px-6 py-16 text-center">
                <p className="font-display text-4xl">
                  {search ? "No matching notes" : "No notes yet"}
                </p>
                <p className="mt-3 text-muted-foreground">
                  {search ? "试试别的关键词。" : "在对话中导出笔记后，这里会变成你的私人资料库。"}
                </p>
              </div>
            )}
            {notes.map((note) => (
              <div
                key={note.id}
                className="paper-card group rounded-[1.8rem] p-5 transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-accent/60 hover:shadow-[var(--paper-shadow-hover)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/notes/${note.id}`} className="flex-1 min-w-0">
                    <h3 className="truncate font-display text-3xl leading-none">{note.title}</h3>
                    {note.summary && (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{note.summary}</p>
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
