"use client";

import { useState, useCallback } from "react";
import { MessageList, type Message } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = useCallback((content: string) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    // TODO: Replace with actual API call
    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "这是一个模拟回复。LLM 集成将在 Phase 2 实现。",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
