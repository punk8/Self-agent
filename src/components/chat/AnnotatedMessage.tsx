"use client";

import { useEffect } from "react";
import { useAnnotationStore } from "@/stores/annotation-store";
import { SelectableText } from "./SelectableText";
import { InlineAnnotation } from "./InlineAnnotation";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

interface AnnotatedMessageProps {
  messageId: string;
  content: string;
  isStreaming?: boolean;
}

export function AnnotatedMessage({ messageId, content, isStreaming }: AnnotatedMessageProps) {
  const { getAnnotationsForMessage, setAnnotations } = useAnnotationStore();
  const annotations = getAnnotationsForMessage(messageId);

  // Load annotations from API on mount (for persisted annotations)
  useEffect(() => {
    if (messageId.startsWith("assistant-")) return; // temp ID, skip

    fetch(`/api/annotations/${messageId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.annotations?.length > 0) {
          setAnnotations(messageId, data.annotations);
        }
      })
      .catch(() => {});
  }, [messageId, setAnnotations]);

  return (
    <div>
      <SelectableText messageId={messageId}>
        <MarkdownRenderer content={content} />
        {isStreaming && (
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-foreground/50" />
        )}
      </SelectableText>

      {annotations.length > 0 && (
        <div className="mt-3 space-y-1">
          {annotations.map((annotation) => (
            <InlineAnnotation key={annotation.id} annotation={annotation} />
          ))}
        </div>
      )}
    </div>
  );
}
