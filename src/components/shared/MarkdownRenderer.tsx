"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState, useCallback } from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      title="复制代码"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-pre:relative prose-pre:bg-muted prose-pre:rounded-lg",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm",
        "prose-p:leading-7 prose-li:leading-7",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre({ children, ...props }) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const codeElement = (children as any)?.props;
            const codeText = typeof codeElement?.children === "string" ? codeElement.children : "";
            return (
              <pre {...props} className="relative group">
                <CopyButton text={codeText} />
                {children}
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
