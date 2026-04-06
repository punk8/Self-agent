import type { ChatMessage } from "./types";

interface ContextOptions {
  maxTokens: number;
  reserveForOutput: number;
}

/**
 * Simple context manager that truncates old messages to fit within token limits.
 * Uses a rough estimate of 4 chars per token.
 */
export function buildContext(
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  options: ContextOptions
): ChatMessage[] {
  const maxInputTokens = options.maxTokens - options.reserveForOutput;
  const result: ChatMessage[] = [];

  let tokenCount = systemPrompt ? estimateTokens(systemPrompt) : 0;

  // Always include messages from newest to oldest, then reverse
  const reversed = [...messages].reverse();

  for (const msg of reversed) {
    const msgTokens = estimateTokens(msg.content);
    if (tokenCount + msgTokens > maxInputTokens) break;
    tokenCount += msgTokens;
    result.unshift(msg);
  }

  return result;
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English, ~2 for Chinese
  return Math.ceil(text.length / 3);
}
