"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete?: (id: string) => void;
  collapsed?: boolean;
}

function formatConversationTimestamp(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return "Recent update";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function CompactHint({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+0.7rem)] top-1/2 z-30 hidden -translate-y-1/2 rounded-full border border-border/70 bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--paper-shadow-soft)] backdrop-blur group-hover:block">
      {label}
    </span>
  );
}

function CompactConversationPreview({
  title,
  updatedAt,
  active,
}: {
  title: string;
  updatedAt: string;
  active: boolean;
}) {
  return (
    <div className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-30 hidden w-56 -translate-y-1/2 rounded-[1.25rem] border border-border/70 bg-background/95 px-3.5 py-3 text-left shadow-[var(--paper-shadow-hover)] backdrop-blur transition-all duration-200 group-hover:block">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(249,191,101,0.16)]">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{formatConversationTimestamp(updatedAt)}</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>{active ? "当前会话" : "Quiet thread"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  collapsed = false,
}: ConversationListProps) {
  return (
    <div className={cn("flex h-full flex-col", collapsed && "overflow-visible")}>
      <div className={cn("px-4 pb-3 pt-5", collapsed && "px-3")}>
        <div className={cn("mb-5", collapsed && "mb-3")}>
          {!collapsed ? (
            <>
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">
                Conversations
              </p>
              <h2 className="font-display text-[2rem] leading-none">Self-Agent</h2>
            </>
          ) : (
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(249,191,101,0.16)] text-foreground shadow-[var(--paper-shadow-soft)]">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
        <Button
          onClick={onNew}
          className={cn("group relative w-full gap-2", collapsed ? "justify-center px-0" : "justify-start")}
          variant="outline"
          title="新对话"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && "新对话"}
          {collapsed && <CompactHint label="新对话" />}
        </Button>
      </div>
      <div
        className={cn(
          "scrollbar-thin flex-1 overflow-y-auto pb-4",
          collapsed ? "overflow-x-visible px-2" : "px-3"
        )}
      >
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "paper-card group relative mb-2 flex w-full items-center rounded-[1.35rem] text-sm transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-accent/70 hover:shadow-[var(--paper-shadow-soft)]",
              activeId === conv.id && "bg-accent/85 shadow-[var(--paper-shadow-soft)]",
              collapsed && "ring-1 ring-transparent hover:ring-border/60"
            )}
          >
            <button
              onClick={() => onSelect(conv.id)}
              className={cn(
                "flex min-w-0 flex-1 text-left",
                collapsed ? "justify-center px-0 py-3" : "items-center gap-3 px-4 py-3"
              )}
              title={conv.title || "新对话"}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(249,191,101,0.16)] text-foreground">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <span className="block truncate font-medium">{conv.title || "新对话"}</span>
                  <span className="block text-xs text-muted-foreground">Quiet thread</span>
                </div>
              )}
              {collapsed && (
                <CompactConversationPreview
                  title={conv.title || "新对话"}
                  updatedAt={conv.updatedAt}
                  active={activeId === conv.id}
                />
              )}
            </button>
            {onDelete && !collapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="mr-3 hidden rounded-full p-2 text-muted-foreground hover:bg-background/70 hover:text-destructive group-hover:block"
                title="删除对话"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {conversations.length === 0 && (
          collapsed ? (
            <div className="px-2 py-6 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Empty</p>
            </div>
          ) : (
            <div className="paper-card mx-1 rounded-[1.5rem] px-4 py-8 text-center">
              <p className="font-display text-2xl">No conversations yet</p>
              <p className="mt-2 text-sm text-muted-foreground">从一段安静的思考开始。</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
