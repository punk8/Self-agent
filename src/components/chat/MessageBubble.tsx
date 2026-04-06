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
            ? "order-2 border-[#232316]/90 bg-[#232316] text-[#f8f2e9] shadow-[0_18px_34px_rgba(35,35,22,0.18)]"
            : "border-[rgba(43,38,29,0.08)] bg-[rgba(249,191,101,0.16)] text-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "min-w-0 max-w-3xl rounded-[1.75rem] px-5 py-4 md:px-6",
          isUser
            ? "order-1 border border-[#232316]/90 bg-[#232316] text-[#f8f2e9] shadow-[0_24px_50px_rgba(35,35,22,0.2)]"
            : "paper-card bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(245,237,224,0.9))]"
        )}
      >
        <p
          className={cn(
            "mb-2 text-[0.68rem] uppercase tracking-[0.24em]",
            isUser ? "text-[#f8f2e9]/72" : "text-muted-foreground"
          )}
        >
          {isUser ? "You" : "Self-Agent"}
        </p>
        <div
          className={cn(
            "break-words text-[0.95rem] leading-7",
            isUser ? "font-medium text-[#f8f2e9]" : "text-foreground"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-inherit">{content}</p>
          ) : (
            <AnnotatedMessage messageId={id} content={content} isStreaming={isStreaming} />
          )}
        </div>
      </div>
    </div>
  );
}
