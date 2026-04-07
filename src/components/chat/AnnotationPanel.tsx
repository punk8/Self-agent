"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAnnotationStore, type FollowUp } from "@/stores/annotation-store";
import { useConversationStore } from "@/stores/conversation-store";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { X, Trash2, Loader2, MessageSquareQuote, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseSSEStream } from "@/lib/sse-parser";

const PANEL_DURATION = 320;

export function AnnotationPanel() {
  const { setActiveAnnotationId, removeAnnotation, getActiveAnnotation, addFollowUp, appendToLastFollowUp, updateLastFollowUp } =
    useAnnotationStore();
  const selectedModel = useConversationStore((s) => s.selectedModel);

  const annotation = getActiveAnnotation();
  const [closingAnnotation, setClosingAnnotation] = useState(annotation);
  const closeTimerRef = useRef<number | null>(null);
  const visibleAnnotation = annotation ?? closingAnnotation;
  const isOpen = Boolean(annotation);

  // Follow-up input
  const [followUpInput, setFollowUpInput] = useState("");
  const [isAskingFollowUp, setIsAskingFollowUp] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setClosingAnnotation(null), PANEL_DURATION);
  }, []);

  const handleClose = useCallback(() => {
    if (!annotation) return;
    setClosingAnnotation(annotation);
    setActiveAnnotationId(null);
    scheduleClose();
  }, [annotation, scheduleClose, setActiveAnnotationId]);

  useEffect(() => {
    if (!annotation) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [annotation, handleClose]);

  useEffect(() => {
    return () => { if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current); };
  }, []);

  // Auto-scroll when streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleAnnotation?.answer, visibleAnnotation?.followUps]);

  if (!visibleAnnotation) return null;

  const handleDelete = async () => {
    setClosingAnnotation(visibleAnnotation);
    setActiveAnnotationId(null);
    if (visibleAnnotation.id.startsWith("temp-")) {
      removeAnnotation(visibleAnnotation.messageId, visibleAnnotation.id);
      scheduleClose();
      return;
    }
    await fetch(`/api/annotations/delete/${visibleAnnotation.id}`, { method: "DELETE" });
    removeAnnotation(visibleAnnotation.messageId, visibleAnnotation.id);
    scheduleClose();
  };

  const handleFollowUp = async () => {
    const q = followUpInput.trim();
    if (!q || isAskingFollowUp || visibleAnnotation.id.startsWith("temp-")) return;

    setIsAskingFollowUp(true);
    setFollowUpInput("");

    addFollowUp(visibleAnnotation.messageId, visibleAnnotation.id, {
      question: q,
      answer: "",
      isStreaming: true,
    });

    try {
      const res = await fetch(`/api/annotations/${visibleAnnotation.messageId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annotationId: visibleAnnotation.id,
          question: q,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        updateLastFollowUp(visibleAnnotation.messageId, visibleAnnotation.id, {
          answer: "请求失败", isStreaming: false,
        });
        setIsAskingFollowUp(false);
        return;
      }

      for await (const event of parseSSEStream(res)) {
        if (event.type === "token") {
          appendToLastFollowUp(visibleAnnotation.messageId, visibleAnnotation.id, event.content || "");
        } else if (event.type === "done") {
          updateLastFollowUp(visibleAnnotation.messageId, visibleAnnotation.id, { isStreaming: false });
        } else if (event.type === "error") {
          updateLastFollowUp(visibleAnnotation.messageId, visibleAnnotation.id, {
            answer: `错误: ${event.error}`, isStreaming: false,
          });
        }
      }
    } catch (err) {
      updateLastFollowUp(visibleAnnotation.messageId, visibleAnnotation.id, {
        answer: `错误: ${err instanceof Error ? err.message : "Unknown"}`, isStreaming: false,
      });
    } finally {
      setIsAskingFollowUp(false);
    }
  };

  const anyStreaming = visibleAnnotation.isStreaming || visibleAnnotation.followUps.some((f) => f.isStreaming);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-[#16160f]/25 backdrop-blur-[2px] transition-opacity ${
          isOpen ? "duration-300 opacity-100" : "duration-200 opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border bg-background md:w-[420px] md:max-w-[90vw] ${
          isOpen
            ? "translate-x-0 opacity-100 duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
            : "translate-x-full opacity-0 duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
        } transition-[transform,opacity]`}
        style={{ boxShadow: isOpen ? "0 0 60px rgba(17,18,8,0.18)" : "none" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">标注详情</span>
          </div>
          <div className="flex items-center gap-1">
            {!anyStreaming && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleDelete} title="删除标注">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {/* Selected text */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">选中文本</p>
            <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm leading-relaxed">
              {visibleAnnotation.selectedText}
            </div>
          </div>

          {/* Original Q&A */}
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">提问</p>
            <p className="text-sm font-medium">{visibleAnnotation.question}</p>
          </div>
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">回答</p>
            <div className="text-sm">
              <MarkdownRenderer content={visibleAnnotation.answer || "..."} />
              {visibleAnnotation.isStreaming && (
                <Loader2 className="mt-1 h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Follow-up thread */}
          {visibleAnnotation.followUps.length > 0 && (
            <div className="border-t border-border/60 pt-3 space-y-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">追问</p>
              {visibleAnnotation.followUps.map((fu, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">Q</span>
                    </div>
                    <p className="text-sm font-medium">{fu.question}</p>
                  </div>
                  <div className="pl-7 text-sm">
                    <MarkdownRenderer content={fu.answer || "..."} />
                    {fu.isStreaming && (
                      <Loader2 className="mt-1 h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-up input - only show when annotation is persisted (not temp) */}
        {!visibleAnnotation.id.startsWith("temp-") && !visibleAnnotation.isStreaming && (
          <div className="border-t border-border/80 p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleFollowUp();
                  }
                }}
                placeholder="继续追问..."
                disabled={isAskingFollowUp}
                className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button size="icon" variant="ghost" onClick={handleFollowUp}
                disabled={!followUpInput.trim() || isAskingFollowUp} className="h-9 w-9 shrink-0">
                {isAskingFollowUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
