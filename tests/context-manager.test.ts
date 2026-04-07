import { describe, expect, it } from "vitest";
import { buildContext, estimateTokens } from "@/lib/llm/context-manager";

describe("context-manager", () => {
  it("estimates token count by rough character ratio", () => {
    expect(estimateTokens("abc")).toBe(1);
    expect(estimateTokens("abcd")).toBe(2);
  });

  it("returns original messages when total tokens fit budget", () => {
    const messages = [
      { role: "user" as const, content: "hello" },
      { role: "assistant" as const, content: "world" },
    ];

    const out = buildContext(messages, undefined, { maxTokens: 200, reserveForOutput: 50 });

    expect(out).toEqual(messages);
  });

  it("compresses older messages when budget is exceeded", () => {
    const messages = [
      { role: "assistant" as const, content: "开场说明" },
      { role: "user" as const, content: "请解释这个很长很长的问题".repeat(20) },
      { role: "assistant" as const, content: "这是一个很长很长的回答".repeat(40) },
      { role: "user" as const, content: "最近一条问题" },
      { role: "assistant" as const, content: "最近一条回答" },
    ];

    const out = buildContext(messages, "系统提示", { maxTokens: 150, reserveForOutput: 20 });

    expect(out[0].role).toBe("system");
    expect(out[0].content).toContain("以下是对话早期内容的摘要");
    expect(out.some((m) => m.content === "最近一条问题")).toBe(true);
    expect(out.some((m) => m.content === "最近一条回答")).toBe(true);
  });

  it("keeps only recent messages if nothing old remains after budgeting", () => {
    const messages = [
      { role: "user" as const, content: "a".repeat(120) },
      { role: "assistant" as const, content: "b".repeat(120) },
      { role: "user" as const, content: "short" },
    ];

    const out = buildContext(messages, undefined, { maxTokens: 50, reserveForOutput: 10 });

    expect(out.length).toBeGreaterThan(0);
    expect(out[out.length - 1].content).toBe("short");
  });
});
