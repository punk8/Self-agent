"use client";

import { useCallback, useRef, useEffect } from "react";
import { useAnnotationStore } from "@/stores/annotation-store";

interface SelectableTextProps {
  messageId: string;
  children: React.ReactNode;
}

export function SelectableText({ messageId, children }: SelectableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setActiveSelection } = useAnnotationStore();

  const handleSelection = useCallback(() => {
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

  // Desktop: mouseup
  const handleMouseUp = useCallback(() => {
    // Small delay to let selection finalize
    setTimeout(handleSelection, 10);
  }, [handleSelection]);

  // Mobile: listen to selectionchange for touch-based selection
  useEffect(() => {
    let selectionTimeout: ReturnType<typeof setTimeout>;

    const handleSelectionChange = () => {
      // Debounce to wait for selection to stabilize
      clearTimeout(selectionTimeout);
      selectionTimeout = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !containerRef.current) return;

        const range = selection.getRangeAt(0);
        if (!containerRef.current.contains(range.commonAncestorContainer)) return;

        handleSelection();
      }, 300);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      clearTimeout(selectionTimeout);
    };
  }, [handleSelection]);

  return (
    <div ref={containerRef} onMouseUp={handleMouseUp}>
      {children}
    </div>
  );
}
