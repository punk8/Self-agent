"use client";

import { ConversationList } from "@/components/sidebar/ConversationList";

export function ChatSidebar() {
  // TODO: Replace with real data from API
  const conversations = [
    { id: "1", title: "关于 React 的讨论", updatedAt: new Date().toISOString() },
    { id: "2", title: "Python 学习笔记", updatedAt: new Date().toISOString() },
  ];

  return (
    <ConversationList
      conversations={conversations}
      onSelect={(id) => console.log("select", id)}
      onNew={() => console.log("new conversation")}
    />
  );
}
