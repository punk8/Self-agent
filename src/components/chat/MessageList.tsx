"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { FloatingToolbar } from "./FloatingToolbar";
import { AnnotationPanel } from "./AnnotationPanel";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="daylight-grid flex flex-1 items-center justify-center px-6">
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="ambient-glow absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full" />
          <div className="paper-card relative rounded-[2rem] px-8 py-12 md:px-14 md:py-16">
            <p className="mb-3 text-[0.72rem] uppercase tracking-[0.3em] text-muted-foreground">
              Reflective workspace
            </p>
            <h2 className="font-display text-5xl leading-[0.92] md:text-7xl">
              Think with your notes, quietly.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              把聊天、划句提问和笔记整理放进同一个更安静的工作台里。
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="paper-card rounded-full px-4 py-2">划句提问</span>
              <span className="paper-card rounded-full px-4 py-2">流式对话</span>
              <span className="paper-card rounded-full px-4 py-2">沉淀笔记</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="scrollbar-thin flex-1">
      <div className="mx-auto max-w-5xl py-5">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            id={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
          />
        ))}
      </div>
      <div ref={bottomRef} />
      <FloatingToolbar />
      <AnnotationPanel />
    </ScrollArea>
  );
}
