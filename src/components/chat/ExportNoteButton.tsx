"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookmarkPlus, Loader2, Check } from "lucide-react";
import { exportConversationToNote } from "@/lib/api-client";

interface ExportNoteButtonProps {
  conversationId: string | undefined;
}

export function ExportNoteButton({ conversationId }: ExportNoteButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  if (!conversationId) return null;

  const handleExport = async () => {
    setStatus("loading");
    try {
      await exportConversationToNote(conversationId);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("idle");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs"
      onClick={handleExport}
      disabled={status === "loading"}
    >
      {status === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : status === "done" ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <BookmarkPlus className="h-3.5 w-3.5" />
      )}
      {status === "done" ? "已导出" : "导出笔记"}
    </Button>
  );
}
