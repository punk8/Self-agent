"use client";

import { useAnnotationStore } from "@/stores/annotation-store";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { X, Trash2, Loader2, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AnnotationPanel() {
  const { activeAnnotationId, setActiveAnnotationId, removeAnnotation, getActiveAnnotation } =
    useAnnotationStore();

  const annotation = getActiveAnnotation();

  if (!annotation) return null;

  const handleDelete = async () => {
    if (annotation.id.startsWith("temp-")) {
      removeAnnotation(annotation.messageId, annotation.id);
      return;
    }
    await fetch(`/api/annotations/delete/${annotation.id}`, { method: "DELETE" });
    removeAnnotation(annotation.messageId, annotation.id);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => setActiveAnnotationId(null)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-[400px] max-w-[90vw] border-l border-border bg-background shadow-xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">标注详情</span>
          </div>
          <div className="flex items-center gap-1">
            {!annotation.isStreaming && (
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
              onClick={() => setActiveAnnotationId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 h-[calc(100%-53px)]">
          {/* Selected text */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              选中文本
            </p>
            <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm leading-relaxed">
              {annotation.selectedText}
            </div>
          </div>

          {/* Question */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              提问
            </p>
            <p className="text-sm font-medium">{annotation.question}</p>
          </div>

          {/* Answer */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              回答
            </p>
            <div className="text-sm">
              <MarkdownRenderer content={annotation.answer || "..."} />
              {annotation.isStreaming && (
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
