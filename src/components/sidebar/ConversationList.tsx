"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, Plus } from "lucide-react";
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
}

export function ConversationList({ conversations, activeId, onSelect, onNew }: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button onClick={onNew} className="w-full justify-start gap-2" variant="outline">
          <Plus className="h-4 w-4" />
          新对话
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
              activeId === conv.id && "bg-accent"
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{conv.title || "新对话"}</span>
          </button>
        ))}
        {conversations.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            暂无对话
          </p>
        )}
      </div>
    </div>
  );
}
