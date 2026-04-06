"use client";

import { useState } from "react";
import { useAnnotationStore } from "@/stores/annotation-store";
import { Button } from "@/components/ui/button";
import { MessageSquareQuote, X, SendHorizontal, Loader2 } from "lucide-react";
import { parseSSEStream } from "@/lib/sse-parser";

export function FloatingToolbar() {
  const { activeSelection, clearSelection, addAnnotation, updateAnnotation } =
    useAnnotationStore();
  const [showInput, setShowInput] = useState(false);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  if (!activeSelection) return null;

  const { messageId, text, startOffset, endOffset, rect } = activeSelection;

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;

    setIsAsking(true);
    const tempId = `temp-${Date.now()}`;

    addAnnotation({
      id: tempId,
      messageId,
      startOffset,
      endOffset,
      selectedText: text,
      question: question.trim(),
      answer: "",
      isStreaming: true,
      isExpanded: true,
    });

    setShowInput(false);
    setQuestion("");
    clearSelection();

    try {
      const response = await fetch("/api/chat/annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          selectedText: text,
          question: question.trim(),
          startOffset,
          endOffset,
        }),
      });

      if (!response.ok) {
        updateAnnotation(messageId, tempId, {
          answer: "请求失败",
          isStreaming: false,
        });
        return;
      }

      for await (const event of parseSSEStream(response)) {
        if (event.type === "token") {
          updateAnnotation(messageId, tempId, {
            answer:
              (useAnnotationStore.getState().getAnnotationsForMessage(messageId).find((a) => a.id === tempId)?.answer || "") +
              (event.content || ""),
          });
        } else if (event.type === "done") {
          const annotationId = (event as unknown as { annotationId: string }).annotationId;
          updateAnnotation(messageId, tempId, {
            id: annotationId || tempId,
            isStreaming: false,
          });
        } else if (event.type === "error") {
          updateAnnotation(messageId, tempId, {
            answer: `错误: ${event.error}`,
            isStreaming: false,
          });
        }
      }
    } catch (err) {
      updateAnnotation(messageId, tempId, {
        answer: `错误: ${err instanceof Error ? err.message : "Unknown"}`,
        isStreaming: false,
      });
    } finally {
      setIsAsking(false);
    }
  };

  // Position the toolbar above the selection
  const top = rect.top - 50 + window.scrollY;
  const left = rect.left + rect.width / 2 - 60;

  return (
    <div
      className="fixed z-50 flex flex-col items-center gap-2"
      style={{ top: `${Math.max(8, rect.top - (showInput ? 120 : 50))}px`, left: `${Math.max(8, left)}px` }}
    >
      {showInput ? (
        <div className="flex items-center gap-1 rounded-lg border border-border bg-popover p-2 shadow-lg">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="输入你的问题..."
            className="h-8 w-56 rounded border-none bg-transparent px-2 text-sm focus:outline-none"
            autoFocus
          />
          <Button size="icon" variant="ghost" onClick={handleAsk} disabled={!question.trim()}>
            {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setShowInput(false);
              setQuestion("");
              clearSelection();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-lg">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs"
            onClick={() => setShowInput(true)}
          >
            <MessageSquareQuote className="h-3.5 w-3.5" />
            提问
          </Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={clearSelection}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
