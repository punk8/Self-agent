"use client";

import { useState, useEffect, useRef } from "react";
import { fetchNotes, fetchTags, deleteNote, type NoteSummary, type TagWithCount } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FileText, Tag, Trash2, ExternalLink, Search, ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";

const DRAWER_ANIMATION_MS = 260;

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const drawerCloseTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!isDrawerMounted) return;

    const animationFrame = window.requestAnimationFrame(() => {
      setIsDrawerVisible(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isDrawerMounted]);

  useEffect(() => {
    return () => {
      if (drawerCloseTimerRef.current) {
        window.clearTimeout(drawerCloseTimerRef.current);
      }
    };
  }, []);

  const openDrawer = () => {
    if (drawerCloseTimerRef.current) {
      window.clearTimeout(drawerCloseTimerRef.current);
      drawerCloseTimerRef.current = null;
    }
    setIsDrawerMounted(true);
  };

  const closeDrawer = () => {
    setIsDrawerVisible(false);
    if (drawerCloseTimerRef.current) {
      window.clearTimeout(drawerCloseTimerRef.current);
    }
    drawerCloseTimerRef.current = window.setTimeout(() => {
      setIsDrawerMounted(false);
      drawerCloseTimerRef.current = null;
    }, DRAWER_ANIMATION_MS);
  };

  const renderTagList = (compact = false, closeOnSelect = false) => (
    <>
      <button
        onClick={() => {
          setSelectedTagId(undefined);
          if (closeOnSelect) {
            closeDrawer();
          }
        }}
        className={cn(
          "mb-1 flex w-full items-center gap-2 rounded-[1.2rem] px-3 py-2.5 text-sm transition-colors hover:bg-accent/70",
          !selectedTagId && "paper-card font-medium",
          compact && "justify-center px-2"
        )}
        title="全部笔记"
      >
        <FileText className="h-3.5 w-3.5 shrink-0" />
        {!compact && "全部笔记"}
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => {
            setSelectedTagId(tag.id);
            if (closeOnSelect) {
              closeDrawer();
            }
          }}
          className={cn(
            "mb-1 flex w-full items-center gap-2 rounded-[1.2rem] px-3 py-2.5 text-sm transition-colors hover:bg-accent/70",
            selectedTagId === tag.id && "paper-card font-medium",
            compact && "justify-center px-2"
          )}
          title={tag.name}
        >
          <Tag className="h-3.5 w-3.5 shrink-0" />
          {!compact && (
            <>
              <span className="flex-1 truncate text-left">{tag.name}</span>
              <span className="text-xs text-muted-foreground">{tag._count.notes}</span>
            </>
          )}
        </button>
      ))}
    </>
  );

  return (
    <div className="flex h-screen bg-transparent">
      {isDrawerMounted && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className={cn(
              "absolute inset-0 bg-[#16160f]/30 backdrop-blur-sm transition-opacity duration-300",
              isDrawerVisible ? "opacity-100" : "opacity-0"
            )}
            onClick={closeDrawer}
          />
          <aside
            className={cn(
              "paper-panel absolute inset-y-3 left-3 w-[18rem] overflow-hidden rounded-[1.75rem] transition-[transform,opacity] duration-300 ease-out",
              isDrawerVisible ? "translate-x-0 opacity-100" : "-translate-x-[105%] opacity-0"
            )}
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div>
                <p className="text-[0.64rem] uppercase tracking-[0.22em] text-muted-foreground">Library</p>
                <h3 className="font-display text-2xl leading-none">Tags</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={closeDrawer}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <div className="scrollbar-thin h-[calc(100%-72px)] overflow-y-auto p-4">
              {renderTagList(false, true)}
            </div>
          </aside>
        </div>
      )}

      {/* Tag sidebar */}
      <aside
        className={cn(
          "paper-panel hidden shrink-0 rounded-l-[2rem] border-r-0 transition-[width] duration-300 md:block",
          isSidebarCollapsed ? "w-[5.5rem]" : "w-64"
        )}
      >
        <div className="p-5">
          <div className={cn("mb-4 flex items-start justify-between", isSidebarCollapsed && "justify-center")}>
            {!isSidebarCollapsed && (
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">Library</p>
                <h3 className="font-display text-[2rem] leading-none">Tags</h3>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed((v) => !v)}>
              {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
          {renderTagList(isSidebarCollapsed)}
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
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              onClick={openDrawer}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
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
          <div className="mt-2 md:hidden">
            <button
              onClick={openDrawer}
              className="inline-flex items-center rounded-full border border-input bg-background/70 px-3 py-1.5 text-xs text-muted-foreground shadow-[var(--paper-shadow-soft)]"
            >
              {selectedTagId
                ? `标签: ${tags.find((t) => t.id === selectedTagId)?.name ?? "已选择"}`
                : "全部标签"}
            </button>
          </div>
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
