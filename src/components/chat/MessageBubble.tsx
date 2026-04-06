import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";
import { AnnotatedMessage } from "./AnnotatedMessage";

interface MessageBubbleProps {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ id, role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-2 px-3 py-4 md:gap-3 md:px-4 md:py-6", isUser ? "bg-transparent" : "bg-muted/50")}>
      <div
        className={cn(
          "hidden h-7 w-7 shrink-0 items-center justify-center rounded-full md:flex md:h-8 md:w-8",
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
            <AnnotatedMessage messageId={id} content={content} isStreaming={isStreaming} />
          )}
        </div>
      </div>
    </div>
  );
}
