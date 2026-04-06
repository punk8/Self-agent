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
      <div className="p-3">
        <Button onClick={onNew} className="w-full justify-start gap-2" variant="outline">
          <Plus className="h-4 w-4" />
          新对话
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "group flex w-full items-center rounded-md text-sm transition-colors hover:bg-accent",
              activeId === conv.id && "bg-accent"
            )}
          >
            <button
              onClick={() => onSelect(conv.id)}
              className="flex flex-1 items-center gap-2 px-3 py-2 text-left min-w-0"
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{conv.title || "新对话"}</span>
            </button>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="mr-2 hidden rounded p-1 text-muted-foreground hover:text-destructive group-hover:block"
                title="删除对话"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
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
