"use client";

import { useEffect } from "react";
import { useConversationStore } from "@/stores/conversation-store";
import { ConversationList } from "@/components/sidebar/ConversationList";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export function ChatSidebar() {
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
      <div className="flex-1 overflow-hidden">
        <ConversationList
          conversations={items}
          activeId={activeConversationId}
          onSelect={selectConversation}
          onNew={startNewConversation}
          onDelete={removeConversation}
        />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/notes"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <BookOpen className="h-4 w-4" />
          笔记
        </Link>
      </div>
    </div>
  );
}
