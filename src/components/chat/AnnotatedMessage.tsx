"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAnnotationStore } from "@/stores/annotation-store";
import { SelectableText } from "./SelectableText";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

interface AnnotatedMessageProps {
  messageId: string;
  content: string;
  isStreaming?: boolean;
}

/**
 * Walk the DOM tree to find text node boundaries, then wrap the range
 * matching [startOffset, endOffset] with a clickable highlight span.
 */
function highlightAnnotations(
  container: HTMLElement,
  annotations: { id: string; startOffset: number; endOffset: number; selectedText: string }[],
  onClick: (id: string) => void,
  activeId: string | null,
) {
  // Remove old highlights
  container.querySelectorAll("[data-annotation-highlight]").forEach((el) => {
    const parent = el.parentNode;
    if (parent) {
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
  });

  if (annotations.length === 0) return;

  // Build a map of text positions -> DOM text nodes
  const textNodes: { node: Text; start: number; end: number }[] = [];
  let offset = 0;

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node as Text).length;
      textNodes.push({ node: node as Text, start: offset, end: offset + len });
      offset += len;
    } else {
      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }
    }
  }
  walk(container);

  // Sort annotations by startOffset (process in reverse to avoid offset shifts)
  const sorted = [...annotations].sort((a, b) => b.startOffset - a.startOffset);

  for (const ann of sorted) {
    const { id, startOffset, endOffset } = ann;

    // Find the text nodes that contain this range
    const range = document.createRange();
    let startSet = false;
    let endSet = false;

    for (const tn of textNodes) {
      if (!startSet && tn.end > startOffset) {
        range.setStart(tn.node, Math.max(0, startOffset - tn.start));
        startSet = true;
      }
      if (!endSet && tn.end >= endOffset) {
        range.setEnd(tn.node, Math.min(tn.node.length, endOffset - tn.start));
        endSet = true;
        break;
      }
    }

    if (!startSet || !endSet) continue;

    try {
      const span = document.createElement("span");
      span.setAttribute("data-annotation-highlight", id);
      span.className = `cursor-pointer border-b-2 border-dashed transition-colors ${
        activeId === id
          ? "border-primary bg-primary/10"
          : "border-primary/40 hover:border-primary hover:bg-primary/5"
      }`;
      span.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick(id);
      });
      range.surroundContents(span);
    } catch {
      // surroundContents can fail if range crosses element boundaries
      // Fallback: just skip this annotation highlight
    }
  }
}

export function AnnotatedMessage({ messageId, content, isStreaming }: AnnotatedMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { getAnnotationsForMessage, setAnnotations, setActiveAnnotationId, activeAnnotationId } =
    useAnnotationStore();
  const annotations = getAnnotationsForMessage(messageId);

  // Load annotations from API on mount
  useEffect(() => {
    if (messageId.startsWith("assistant-")) return;

    fetch(`/api/annotations/${messageId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.annotations?.length > 0) {
          setAnnotations(messageId, data.annotations);
        }
      })
      .catch(() => {});
  }, [messageId, setAnnotations]);

  const handleHighlightClick = useCallback(
    (annotationId: string) => {
      setActiveAnnotationId(annotationId);
    },
    [setActiveAnnotationId]
  );

  // Apply highlights after render
  useEffect(() => {
    if (!containerRef.current || isStreaming) return;

    // Small delay to ensure markdown is rendered
    const timer = setTimeout(() => {
      if (containerRef.current) {
        highlightAnnotations(containerRef.current, annotations, handleHighlightClick, activeAnnotationId);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [annotations, handleHighlightClick, activeAnnotationId, isStreaming, content]);

  return (
    <div>
      <SelectableText messageId={messageId}>
        <div ref={containerRef}>
          <MarkdownRenderer content={content} />
        </div>
        {isStreaming && (
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-foreground/50" />
        )}
      </SelectableText>

      {/* Small annotation count badge */}
      {annotations.length > 0 && !isStreaming && (
        <div className="mt-2 flex flex-wrap gap-1">
          {annotations.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveAnnotationId(a.id)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                activeAnnotationId === a.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <span className="max-w-[120px] truncate">{a.question}</span>
              {a.isStreaming && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
