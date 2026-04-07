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
    activeConversationId,
    selectedModel,
    addUserMessage,
    setActiveConversationId,
    setSelectedModel,
    beginStream,
    appendToken,
    finishStream,
    streamError,
    stopStream,
    isConversationStreaming,
    loadConversations,
    generateAndSetTitle,
  } = useConversationStore();

  const currentStreaming = activeConversationId
    ? isConversationStreaming(activeConversationId)
    : false;

  const handleSend = useCallback(
    async (content: string) => {
      // Allow sending even if another conversation is streaming
      // But block if THIS conversation is streaming
      if (activeConversationId && isConversationStreaming(activeConversationId)) return;

      const controller = new AbortController();
      const convId = activeConversationId; // may be undefined for new conv

      addUserMessage(content);

      // Create the streaming assistant message in current messages
      const store = useConversationStore.getState();
      const updatedMessages = [
        ...store.messages,
        { id: `assistant-${Date.now()}`, role: "assistant" as const, content: "", isStreaming: true },
      ];
      useConversationStore.setState({ messages: updatedMessages });

      // We don't know the real convId yet for new conversations
      // Use a temp key, will be updated when server responds
      const streamKey = convId || `new-${Date.now()}`;
      beginStream(streamKey, controller, updatedMessages);

      try {
        const stream = sendMessage({
          conversationId: convId,
          content,
          model: selectedModel,
          signal: controller.signal,
        });

        let resolvedConvId = convId;

        for await (const event of stream) {
          switch (event.type) {
            case "token":
              appendToken(resolvedConvId || streamKey, event.content || "");
              break;
            case "done": {
              const newConvId = event.conversationId;
              if (newConvId && !convId) {
                // New conversation created — migrate stream key
                resolvedConvId = newConvId;
                const streams = new Map(useConversationStore.getState().activeStreams);
                const old = streams.get(streamKey);
                if (old) {
                  streams.delete(streamKey);
                  streams.set(newConvId, old);
                  useConversationStore.setState({ activeStreams: streams });
                }
                setActiveConversationId(newConvId);
                generateAndSetTitle(newConvId);
                loadConversations();
              }
              finishStream(resolvedConvId || streamKey, event.messageId || "");
              break;
            }
            case "error":
              streamError(resolvedConvId || streamKey, event.error || "Unknown error");
              break;
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User stopped
        } else {
          streamError(convId || streamKey, err instanceof Error ? err.message : "Unknown error");
        }
      }
    },
    [
      activeConversationId,
      selectedModel,
      addUserMessage,
      setActiveConversationId,
      beginStream,
      appendToken,
      finishStream,
      streamError,
      isConversationStreaming,
      loadConversations,
      generateAndSetTitle,
    ]
  );

  const handleStop = useCallback(() => {
    if (activeConversationId) {
      stopStream(activeConversationId);
    }
  }, [activeConversationId, stopStream]);

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
      <ChatInput
        onSend={handleSend}
        disabled={currentStreaming}
        onStop={handleStop}
        isStreaming={currentStreaming}
      />
    </div>
  );
}
