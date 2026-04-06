"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { fetchModels } from "@/lib/api-client";
import { ChevronDown } from "lucide-react";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<Array<{ id: string; name: string; provider: string }>>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchModels().then(setModels);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = models.find((m) => m.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs hover:bg-accent transition-colors"
      >
        <span className="max-w-[120px] truncate">{selected?.name || value}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && models.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onChange(model.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent transition-colors",
                model.id === value && "bg-accent"
              )}
            >
              <span className="font-medium">{model.name}</span>
              <span className="text-[10px] text-muted-foreground">{model.provider}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
