"use client";

import { useState, useEffect, useRef } from "react";
import { fetchNotes, fetchTags, deleteNote, type NoteSummary, type TagWithCount } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FileText, MessageSquare, Tag, Trash2, ExternalLink, Search, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";

const DRAWER_ANIMATION_MS = 260;

function CompactHint({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+0.7rem)] top-1/2 z-30 hidden -translate-y-1/2 rounded-full border border-border/70 bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--paper-shadow-soft)] backdrop-blur group-hover:block">
      {label}
    </span>
  );
}

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
          "paper-card group mb-2 flex w-full items-center rounded-[1.35rem] text-sm transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-accent/70 hover:shadow-[var(--paper-shadow-soft)]",
          !selectedTagId && "bg-accent/85 shadow-[var(--paper-shadow-soft)]",
          compact ? "relative justify-center px-0 py-3" : "gap-3 px-4 py-3"
        )}
        title="全部笔记"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(249,191,101,0.16)] text-foreground">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        {!compact && "全部笔记"}
        {compact && <CompactHint label="全部笔记" />}
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
            "group mb-2 flex w-full items-center rounded-[1.35rem] text-sm transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-accent/70 hover:shadow-[var(--paper-shadow-soft)]",
            selectedTagId === tag.id ? "paper-card bg-accent/85 shadow-[var(--paper-shadow-soft)]" : "story-link text-muted-foreground hover:text-foreground",
            compact ? "relative justify-center px-0 py-3" : "gap-3 px-4 py-3"
          )}
          title={tag.name}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(249,191,101,0.16)] text-foreground">
            <Tag className="h-4 w-4 text-muted-foreground" />
          </div>
          {!compact && (
            <>
              <span className="flex-1 truncate text-left font-medium">{tag.name}</span>
              <span className="text-xs text-muted-foreground">{tag._count.notes}</span>
            </>
          )}
          {compact && <CompactHint label={tag.name} />}
        </button>
      ))}
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-transparent p-2 md:p-4">
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
            <div className="px-4 pb-3 pt-5">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">Library</p>
                  <h3 className="font-display text-[2rem] leading-none">Tags</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeDrawer}
                  className="h-11 w-11 rounded-full border border-border/60 bg-[rgba(249,191,101,0.12)] shadow-[var(--paper-shadow-soft)] hover:bg-[rgba(249,191,101,0.2)]"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="scrollbar-thin h-[calc(100%-124px)] overflow-y-auto px-3 pb-4">
              {renderTagList(false, true)}
            </div>
            <div className="border-t border-sidebar-border/80 px-4 py-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Filter</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedTagId
                    ? `当前: ${tags.find((t) => t.id === selectedTagId)?.name ?? "已选择标签"}`
                    : "当前: 全部标签"}
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Tag sidebar */}
      <aside
        className={cn(
          "paper-panel hidden shrink-0 overflow-visible rounded-[2rem] border-r-0 transition-[width] duration-300 md:block",
          isSidebarCollapsed ? "w-[5.5rem]" : "w-[19.5rem]"
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn("px-4 pb-3 pt-5", isSidebarCollapsed && "px-3 pt-5")}>
            {isSidebarCollapsed ? (
              <div className="mb-4 flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarCollapsed((v) => !v)}
                  className="bg-background/50 backdrop-blur"
                  title={isSidebarCollapsed ? "展开标签栏" : "收起标签栏"}
                >
                  {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="relative mb-5">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">Library</p>
                  <h3 className="font-display text-[2rem] leading-none">Tags</h3>
                </div>
                <div className="absolute right-0 top-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarCollapsed((v) => !v)}
                    className="bg-background/50 backdrop-blur"
                    title="收起标签栏"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div
            className={cn(
              "scrollbar-thin flex-1 overflow-y-auto pb-4",
              isSidebarCollapsed ? "overflow-x-visible px-2" : "px-3"
            )}
          >
            {renderTagList(isSidebarCollapsed)}
          </div>
          <div className={cn("border-t border-sidebar-border/80 px-4 py-4", isSidebarCollapsed && "px-3")}>
            {!isSidebarCollapsed ? (
              <>
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Library</p>
                <Link
                  href="/"
                  className="story-link mt-2 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/65 hover:text-foreground"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedTagId(undefined)}
                  title="查看全部笔记"
                  className="story-link mt-1 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/65 hover:text-foreground"
                >
                  <FileText className="h-4 w-4" />
                  全部笔记
                </button>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  用标签把聊天沉淀成一个更安静的资料库。
                </p>
              </>
            ) : (
              <div className="space-y-1">
                <Link
                  href="/"
                  title="返回聊天"
                  className="story-link group relative flex w-full justify-center rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/65 hover:text-foreground"
                >
                  <MessageSquare className="h-4 w-4" />
                  <CompactHint label="Chat" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedTagId(undefined)}
                  title="查看全部笔记"
                  className="story-link group relative flex w-full justify-center rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/65 hover:text-foreground"
                >
                  <FileText className="h-4 w-4" />
                  <CompactHint label="全部笔记" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Notes list */}
      <main className="paper-panel flex-1 overflow-hidden rounded-[2rem] md:ml-4">
        <div className="border-b border-border/70 p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3">
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

        <ScrollArea className="scrollbar-thin h-[calc(100vh-112px)] md:h-[calc(100vh-144px)]">
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
