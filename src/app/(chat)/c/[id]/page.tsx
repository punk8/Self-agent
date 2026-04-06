"use client";

import { useEffect, use } from "react";
import { useCallback } from "react";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { useConversationStore } from "@/stores/conversation-store";
import { sendMessage } from "@/lib/api-client";

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    messages,
    isStreaming,
    activeConversationId,
    selectConversation,
    addUserMessage,
    startAssistantMessage,
    appendToAssistantMessage,
    finishAssistantMessage,
    setAssistantError,
    setIsStreaming,
    loadConversations,
  } = useConversationStore();

  useEffect(() => {
    if (id !== activeConversationId) {
      selectConversation(id);
    }
  }, [id, activeConversationId, selectConversation]);

  const handleSend = useCallback(
    async (content: string) => {
      if (isStreaming) return;

      addUserMessage(content);
      startAssistantMessage();
      setIsStreaming(true);

      try {
        const stream = sendMessage({
          conversationId: id,
          content,
        });

        for await (const event of stream) {
          switch (event.type) {
            case "token":
              appendToAssistantMessage(event.content || "");
              break;
            case "done":
              finishAssistantMessage(event.messageId || "");
              loadConversations();
              break;
            case "error":
              setAssistantError(event.error || "Unknown error");
              break;
          }
        }
      } catch (err) {
        setAssistantError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsStreaming(false);
      }
    },
    [
      id,
      isStreaming,
      addUserMessage,
      startAssistantMessage,
      appendToAssistantMessage,
      finishAssistantMessage,
      setAssistantError,
      setIsStreaming,
      loadConversations,
    ]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
