"use client";

import { useCallback } from "react";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { ExportNoteButton } from "@/components/chat/ExportNoteButton";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { useConversationStore } from "@/stores/conversation-store";
import { sendMessage } from "@/lib/api-client";

export default function ChatPage() {
  const {
    messages,
    isStreaming,
    activeConversationId,
    selectedModel,
    addUserMessage,
    startAssistantMessage,
    appendToAssistantMessage,
    finishAssistantMessage,
    setAssistantError,
    setIsStreaming,
    setActiveConversationId,
    setSelectedModel,
    setAbortController,
    stopStreaming,
    loadConversations,
    generateAndSetTitle,
  } = useConversationStore();

  const handleSend = useCallback(
    async (content: string) => {
      if (isStreaming) return;

      const controller = new AbortController();
      setAbortController(controller);

      addUserMessage(content);
      startAssistantMessage();
      setIsStreaming(true);

      try {
        const stream = sendMessage({
          conversationId: activeConversationId,
          content,
          model: selectedModel,
          signal: controller.signal,
        });

        for await (const event of stream) {
          switch (event.type) {
            case "token":
              appendToAssistantMessage(event.content || "");
              break;
            case "done":
              if (event.conversationId && !activeConversationId) {
                setActiveConversationId(event.conversationId);
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
        if (err instanceof DOMException && err.name === "AbortError") {
          // User stopped the stream - just finalize
        } else {
          setAssistantError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        setIsStreaming(false);
        setAbortController(null);
      }
    },
    [
      isStreaming,
      activeConversationId,
      selectedModel,
      addUserMessage,
      startAssistantMessage,
      appendToAssistantMessage,
      finishAssistantMessage,
      setAssistantError,
      setIsStreaming,
      setActiveConversationId,
      setAbortController,
      loadConversations,
      generateAndSetTitle,
    ]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4 md:px-8">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">Workspace</p>
          <h1 className="font-display text-[2rem] leading-none md:text-[2.35rem]">Self-Agent</h1>
        </div>
        <div className="flex items-center gap-3">
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />
        {activeConversationId && messages.length > 0 && (
          <ExportNoteButton conversationId={activeConversationId} />
        )}
        </div>
      </div>
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} disabled={isStreaming} onStop={stopStreaming} isStreaming={isStreaming} />
    </div>
  );
}
