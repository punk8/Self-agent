"use client";

import { useEffect } from "react";
import { useConversationStore } from "@/stores/conversation-store";
import { ConversationList } from "@/components/sidebar/ConversationList";
import { BookOpen, MessagesSquare, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

function CompactHint({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+0.7rem)] top-1/2 hidden -translate-y-1/2 rounded-full border border-border/70 bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--paper-shadow-soft)] backdrop-blur group-hover:block">
      {label}
    </span>
  );
}

export function ChatSidebar({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: ChatSidebarProps) {
  const {
    conversations,
    activeConversationId,
    loadConversations,
    selectConversation,
    startNewConversation,
    removeConversation,
  } = useConversationStore();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const items = conversations.map((c) => ({
    id: c.id,
    title: c.title || "新对话",
    updatedAt: c.updatedAt,
  }));

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex-1", collapsed ? "overflow-visible" : "overflow-hidden")}>
        <ConversationList
          conversations={items}
          activeId={activeConversationId}
          onSelect={selectConversation}
          onNew={startNewConversation}
          onDelete={removeConversation}
          collapsed={collapsed}
        />
      </div>
      <div className={cn("border-t border-sidebar-border/80 px-4 py-4", collapsed && "px-3")}>
        {!collapsed && (
          <p className="mb-2 text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
            Library
          </p>
        )}
        <Link
          href="/notes"
          onClick={onNavigate}
          title="笔记"
          className={cn(
            "story-link group relative mb-1 flex rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/65 hover:text-foreground",
            collapsed ? "justify-center" : "items-center gap-2"
          )}
        >
          <BookOpen className="h-4 w-4" />
          {!collapsed && "笔记"}
          {collapsed && <CompactHint label="笔记" />}
        </Link>
        <Link
          href="/settings"
          onClick={onNavigate}
          title="设置"
          className={cn(
            "story-link group relative flex rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/65 hover:text-foreground",
            collapsed ? "justify-center" : "items-center gap-2"
          )}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && "设置"}
          {collapsed && <CompactHint label="设置" />}
        </Link>
        {collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="展开会话栏"
            className="story-link group relative mt-2 flex w-full justify-center rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/65 hover:text-foreground"
          >
            <MessagesSquare className="h-4 w-4" />
            <CompactHint label="展开会话栏" />
          </button>
        )}
      </div>
    </div>
  );
}
