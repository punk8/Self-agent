"use client";

import { useState, useCallback, useRef } from "react";
import { MessageList, type Message } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { sendMessage } from "@/lib/api-client";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(
    async (content: string) => {
      if (isStreaming) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const stream = sendMessage({
          conversationId,
          content,
          model: "gpt-4o",
        });

        for await (const event of stream) {
          switch (event.type) {
            case "token":
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + (event.content || ""),
                  };
                }
                return updated;
              });
              break;
            case "done":
              if (event.conversationId) {
                setConversationId(event.conversationId);
              }
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    id: event.messageId || last.id,
                    isStreaming: false,
                  };
                }
                return updated;
              });
              break;
            case "error":
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: `Error: ${event.error}`,
                    isStreaming: false,
                  };
                }
                return updated;
              });
              break;
          }
        }
      } catch (err) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
              isStreaming: false,
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, conversationId]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
