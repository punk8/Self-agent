"use client";

import { useEffect, use, useCallback } from "react";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { useConversationStore } from "@/stores/conversation-store";
import { sendMessage } from "@/lib/api-client";

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    messages,
    activeConversationId,
    selectConversation,
    addUserMessage,
    beginStream,
    appendToken,
    finishStream,
    streamError,
    stopStream,
    isConversationStreaming,
    loadConversations,
  } = useConversationStore();

  useEffect(() => {
    if (id !== activeConversationId) {
      selectConversation(id);
    }
  }, [id, activeConversationId, selectConversation]);

  const currentStreaming = isConversationStreaming(id);

  const handleSend = useCallback(
    async (content: string) => {
      if (currentStreaming) return;

      const controller = new AbortController();
      addUserMessage(content);

      const store = useConversationStore.getState();
      const updatedMessages = [
        ...store.messages,
        { id: `assistant-${Date.now()}`, role: "assistant" as const, content: "", isStreaming: true },
      ];
      useConversationStore.setState({ messages: updatedMessages });
      beginStream(id, controller, updatedMessages);

      try {
        const stream = sendMessage({
          conversationId: id,
          content,
          signal: controller.signal,
        });

        for await (const event of stream) {
          switch (event.type) {
            case "token":
              appendToken(id, event.content || "");
              break;
            case "done":
              finishStream(id, event.messageId || "");
              loadConversations();
              break;
            case "error":
              streamError(id, event.error || "Unknown error");
              break;
          }
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          streamError(id, err instanceof Error ? err.message : "Unknown error");
        }
      }
    },
    [id, currentStreaming, addUserMessage, beginStream, appendToken, finishStream, streamError, loadConversations]
  );

  const handleStop = useCallback(() => {
    stopStream(id);
  }, [id, stopStream]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} disabled={currentStreaming} onStop={handleStop} isStreaming={currentStreaming} />
    </div>
  );
}
