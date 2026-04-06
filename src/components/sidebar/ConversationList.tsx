"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete?: (id: string) => void;
}

export function ConversationList({ conversations, activeId, onSelect, onNew, onDelete }: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-3 pt-5">
        <div className="mb-5">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">
            Conversations
          </p>
          <h2 className="font-display text-[2rem] leading-none">Self-Agent</h2>
        </div>
        <Button onClick={onNew} className="w-full justify-start gap-2" variant="outline">
          <Plus className="h-4 w-4" />
          新对话
        </Button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "paper-card group mb-2 flex w-full items-center rounded-[1.35rem] text-sm transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-accent/70 hover:shadow-[var(--paper-shadow-soft)]",
              activeId === conv.id && "bg-accent/85 shadow-[var(--paper-shadow-soft)]"
            )}
          >
            <button
              onClick={() => onSelect(conv.id)}
              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(249,191,101,0.16)] text-foreground">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <span className="block truncate font-medium">{conv.title || "新对话"}</span>
                <span className="block text-xs text-muted-foreground">Quiet thread</span>
              </div>
            </button>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="mr-3 hidden rounded-full p-2 text-muted-foreground hover:bg-background/70 hover:text-destructive group-hover:block"
                title="删除对话"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="paper-card mx-1 rounded-[1.5rem] px-4 py-8 text-center">
            <p className="font-display text-2xl">No conversations yet</p>
            <p className="mt-2 text-sm text-muted-foreground">从一段安静的思考开始。</p>
          </div>
        )}
      </div>
    </div>
  );
}
