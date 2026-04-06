"use client";

import { useAnnotationStore, type Annotation } from "@/stores/annotation-store";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { ChevronDown, ChevronRight, Trash2, Loader2 } from "lucide-react";

interface InlineAnnotationProps {
  annotation: Annotation;
}

export function InlineAnnotation({ annotation }: InlineAnnotationProps) {
  const { toggleAnnotation, removeAnnotation } = useAnnotationStore();
  const { id, messageId, selectedText, question, answer, isStreaming, isExpanded } = annotation;

  const handleDelete = async () => {
    if (id.startsWith("temp-")) {
      removeAnnotation(messageId, id);
      return;
    }
    await fetch(`/api/annotations/delete/${id}`, { method: "DELETE" });
    removeAnnotation(messageId, id);
  };

  return (
    <div className="my-2 rounded-md border border-border/60 bg-accent/30">
      <button
        onClick={() => toggleAnnotation(messageId, id)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 min-w-0">
          <span className="font-medium text-primary/80 underline decoration-primary/40 decoration-wavy underline-offset-2">
            {selectedText.length > 50 ? selectedText.slice(0, 50) + "..." : selectedText}
          </span>
          <span className="ml-2 text-muted-foreground">— {question}</span>
        </span>
        {isStreaming && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="border-t border-border/40 px-3 py-2">
          <div className="pl-5">
            <MarkdownRenderer content={answer || "..."} className="text-sm" />
            {isStreaming && (
              <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-foreground/50" />
            )}
          </div>
          {!isStreaming && (
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleDelete}
                className="rounded p-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                title="删除标注"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
