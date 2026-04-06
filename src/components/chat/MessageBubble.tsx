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
    <div
      className={cn(
        "fade-up flex gap-3 px-4 py-5 md:px-8 md:py-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border md:flex",
          isUser
            ? "order-2 border-primary/15 bg-primary text-primary-foreground"
            : "border-[rgba(43,38,29,0.08)] bg-[rgba(249,191,101,0.16)] text-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "paper-card min-w-0 max-w-3xl rounded-[1.75rem] px-5 py-4 md:px-6",
          isUser
            ? "order-1 bg-primary text-primary-foreground shadow-[0_24px_50px_rgba(35,35,22,0.18)]"
            : "bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(245,237,224,0.9))]"
        )}
      >
        <p className={cn("mb-2 text-[0.68rem] uppercase tracking-[0.24em]", isUser ? "text-primary-foreground/72" : "text-muted-foreground")}>
          {isUser ? "You" : "Self-Agent"}
        </p>
        <div className="break-words text-[0.95rem] leading-7">
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <AnnotatedMessage messageId={id} content={content} isStreaming={isStreaming} />
          )}
        </div>
      </div>
    </div>
  );
}
