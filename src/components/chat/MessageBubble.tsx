import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 px-4 py-6", isUser ? "bg-transparent" : "bg-muted/50")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium">{isUser ? "你" : "AI"}</p>
        <div className="break-words">
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm">{content}</p>
          ) : (
            <MarkdownRenderer content={content} />
          )}
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-foreground/50" />
          )}
        </div>
      </div>
    </div>
  );
}
