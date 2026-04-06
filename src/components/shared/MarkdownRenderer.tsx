"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import { Check, Copy, ChevronDown, ChevronRight } from "lucide-react";
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
      className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-background/80 hover:text-foreground transition-all"
      title="复制代码"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ children, className, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const codeText = typeof children === "string" ? children.replace(/\n$/, "") : "";
  const lineCount = codeText.split("\n").length;
  const [collapsed, setCollapsed] = useState(lineCount > 30);

  if (!match) {
    // Inline code
    return <code className={className} {...props}>{children}</code>;
  }

  return null; // handled by pre
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        // Code blocks
        "prose-pre:relative prose-pre:bg-[#1e1e2e] prose-pre:rounded-lg prose-pre:border prose-pre:border-border/50",
        "prose-pre:text-[13px] prose-pre:leading-relaxed",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[13px] prose-code:font-medium",
        // Typography
        "prose-p:leading-7 prose-p:my-3",
        "prose-li:leading-7",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
        "prose-h1:border-b prose-h1:border-border prose-h1:pb-2 prose-h1:mb-4",
        "prose-h2:mt-6 prose-h2:mb-3",
        // Tables
        "prose-table:border-collapse prose-table:w-full prose-table:text-sm",
        "prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:border prose-th:border-border",
        "prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-border",
        // Blockquotes
        "prose-blockquote:border-l-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:rounded-r-md prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic",
        // Links
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        // Horizontal rules
        "prose-hr:border-border",
        // Lists
        "prose-ul:my-3 prose-ol:my-3",
        // Images
        "prose-img:rounded-lg prose-img:border prose-img:border-border",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          pre({ children, ...props }) {
            // Extract code text for copy button
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const codeElement = (children as any)?.props;
            const codeText = typeof codeElement?.children === "string" ? codeElement.children : "";
            const langMatch = /language-(\w+)/.exec(codeElement?.className || "");
            const lang = langMatch ? langMatch[1] : "";

            return (
              <div className="group relative">
                {lang && (
                  <div className="absolute left-3 top-0 -translate-y-1/2 rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
                    {lang}
                  </div>
                )}
                <CopyButton text={codeText} />
                <pre {...props} className="group !mt-4">
                  {children}
                </pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
