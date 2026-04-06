"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAnnotationStore } from "@/stores/annotation-store";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { X, Trash2, Loader2, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";

const PANEL_ANIMATION_MS = 280;

export function AnnotationPanel() {
  const { setActiveAnnotationId, removeAnnotation, getActiveAnnotation } =
    useAnnotationStore();

  const annotation = getActiveAnnotation();
  const [closingAnnotation, setClosingAnnotation] = useState(annotation);
  const closeTimerRef = useRef<number | null>(null);
  const visibleAnnotation = annotation ?? closingAnnotation;
  const isOpen = Boolean(annotation);

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    closeTimerRef.current = window.setTimeout(() => {
      setClosingAnnotation(null);
    }, PANEL_ANIMATION_MS);
  }, []);

  const handleClose = useCallback(() => {
    if (!annotation) return;
    setClosingAnnotation(annotation);
    setActiveAnnotationId(null);
    scheduleClose();
  }, [annotation, scheduleClose, setActiveAnnotationId]);

  useEffect(() => {
    if (!annotation) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [annotation, handleClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (!visibleAnnotation) return null;

  const handleDelete = async () => {
    if (!visibleAnnotation) return;

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-[#16160f]/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full border-l border-border bg-background shadow-[0_24px_70px_rgba(17,18,8,0.28)] transition-[transform,opacity] duration-300 ease-out md:w-[420px] md:max-w-[90vw] ${
          isOpen ? "translate-x-0 opacity-100" : "translate-x-5 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">标注详情</span>
          </div>
          <div className="flex items-center gap-1">
            {!visibleAnnotation.isStreaming && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
                title="删除标注"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-53px)] overflow-y-auto p-4 scrollbar-thin">
          {/* Selected text */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              选中文本
            </p>
            <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm leading-relaxed">
              {visibleAnnotation.selectedText}
            </div>
          </div>

          {/* Question */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              提问
            </p>
            <p className="text-sm font-medium">{visibleAnnotation.question}</p>
          </div>

          {/* Answer */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              回答
            </p>
            <div className="text-sm">
              <MarkdownRenderer content={visibleAnnotation.answer || "..."} />
              {visibleAnnotation.isStreaming && (
                <span className="ml-1 inline-flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
