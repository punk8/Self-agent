"use client";

import { useCallback, useRef } from "react";
import { useAnnotationStore } from "@/stores/annotation-store";

interface SelectableTextProps {
  messageId: string;
  children: React.ReactNode;
}

export function SelectableText({ messageId, children }: SelectableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setActiveSelection } = useAnnotationStore();

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 2) return;

    // Check if selection is within our container
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    // Calculate offset within the text content
    const fullText = containerRef.current.textContent || "";
    const startOffset = fullText.indexOf(text);
    const endOffset = startOffset + text.length;

    // Get position for floating toolbar
    const rect = range.getBoundingClientRect();

    setActiveSelection({
      messageId,
      text,
      startOffset: Math.max(0, startOffset),
      endOffset: Math.min(fullText.length, endOffset),
      rect,
    });
  }, [messageId, setActiveSelection]);

  return (
    <div ref={containerRef} onMouseUp={handleMouseUp}>
      {children}
    </div>
  );
}
