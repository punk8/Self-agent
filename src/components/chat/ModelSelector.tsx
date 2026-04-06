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
    fetchModels().then((m) => {
      setModels(m);
      // Auto-select first available model if current selection is not in the list
      if (m.length > 0 && !m.find((mod) => mod.id === value)) {
        onChange(m[0].id);
      }
    });
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

  if (models.length === 0) {
    return (
      <div className="paper-card flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground">
        未配置模型
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="paper-card flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-accent"
      >
        <span className="max-w-[160px] truncate">{selected?.name || value}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && models.length > 0 && (
        <div className="paper-panel absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-[1.25rem] p-2">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onChange(model.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full flex-col items-start rounded-2xl px-3 py-2 text-left text-xs transition-colors hover:bg-accent/70",
                model.id === value && "bg-accent/80"
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
