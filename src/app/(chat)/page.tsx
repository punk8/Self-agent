"use client";

import { useCallback } from "react";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { ExportNoteButton } from "@/components/chat/ExportNoteButton";
import { useConversationStore } from "@/stores/conversation-store";
import { sendMessage } from "@/lib/api-client";

export default function ChatPage() {
  const {
    messages,
    isStreaming,
    activeConversationId,
    addUserMessage,
    startAssistantMessage,
    appendToAssistantMessage,
    finishAssistantMessage,
    setAssistantError,
    setIsStreaming,
    setActiveConversationId,
    loadConversations,
    generateAndSetTitle,
  } = useConversationStore();

  const handleSend = useCallback(
    async (content: string) => {
      if (isStreaming) return;

      addUserMessage(content);
      startAssistantMessage();
      setIsStreaming(true);

      try {
        const stream = sendMessage({
          conversationId: activeConversationId,
          content,
          model: "gpt-4o",
        });

        for await (const event of stream) {
          switch (event.type) {
            case "token":
              appendToAssistantMessage(event.content || "");
              break;
            case "done":
              if (event.conversationId && !activeConversationId) {
                setActiveConversationId(event.conversationId);
                // Generate title for new conversations
                generateAndSetTitle(event.conversationId);
                loadConversations();
              }
              finishAssistantMessage(event.messageId || "");
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
      isStreaming,
      activeConversationId,
      addUserMessage,
      startAssistantMessage,
      appendToAssistantMessage,
      finishAssistantMessage,
      setAssistantError,
      setIsStreaming,
      setActiveConversationId,
      loadConversations,
      generateAndSetTitle,
    ]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {activeConversationId && messages.length > 0 && (
        <div className="flex items-center justify-end border-b border-border px-4 py-1.5">
          <ExportNoteButton conversationId={activeConversationId} />
        </div>
      )}
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
