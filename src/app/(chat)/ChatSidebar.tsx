"use client";

import { useEffect } from "react";
import { useConversationStore } from "@/stores/conversation-store";
import { ConversationList } from "@/components/sidebar/ConversationList";

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
    <ConversationList
      conversations={items}
      activeId={activeConversationId}
      onSelect={selectConversation}
      onNew={startNewConversation}
      onDelete={removeConversation}
    />
  );
}
