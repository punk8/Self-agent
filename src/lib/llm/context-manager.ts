import type { ChatMessage } from "./types";

interface ContextOptions {
  maxTokens: number;
  reserveForOutput: number;
}

/**
 * Build context that fits within token limits.
 * If history is too long, older messages are summarized into a compressed prefix.
 */
export function buildContext(
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  options: ContextOptions
): ChatMessage[] {
  const maxInputTokens = options.maxTokens - options.reserveForOutput;
  let tokenBudget = maxInputTokens;

  if (systemPrompt) {
    tokenBudget -= estimateTokens(systemPrompt);
  }

  // Calculate total tokens
  const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

  // If everything fits, return as-is
  if (totalTokens <= tokenBudget) {
    return messages;
  }

  // Strategy: keep recent messages verbatim, compress older ones into a summary.
  // Reserve 70% of budget for recent messages, 30% for compressed history.
  const recentBudget = Math.floor(tokenBudget * 0.7);
  const compressBudget = Math.floor(tokenBudget * 0.3);

  // Collect recent messages (newest first) until we hit the recent budget
  const recent: ChatMessage[] = [];
  let recentTokens = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (recentTokens + msgTokens > recentBudget) break;
    recentTokens += msgTokens;
    recent.unshift(messages[i]);
  }

  // Compress older messages that didn't fit
  const olderCount = messages.length - recent.length;
  if (olderCount > 0) {
    const older = messages.slice(0, olderCount);
    const compressed = compressMessages(older, compressBudget);
    return [
      { role: "system", content: compressed },
      ...recent,
    ];
  }

  return recent;
}

/**
 * Compress older messages into a concise summary that fits within token budget.
 * This is a local compression (no LLM call) - extracts key information.
 */
function compressMessages(messages: ChatMessage[], maxTokens: number): string {
  const header = "以下是对话早期内容的摘要（用于保持上下文连贯）：\n\n";
  let budget = maxTokens - estimateTokens(header);

  // Extract key exchanges: pair user questions with assistant answer summaries
  const summaryParts: string[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user") {
      // Truncate long questions
      const q = msg.content.length > 100 ? msg.content.slice(0, 100) + "..." : msg.content;
      let entry = `- 用户问: ${q}`;

      // Find the next assistant reply
      if (i + 1 < messages.length && messages[i + 1].role === "assistant") {
        const answer = messages[i + 1].content;
        // Take first 200 chars of the answer as summary
        const aSummary = answer.length > 200 ? answer.slice(0, 200) + "..." : answer;
        entry += `\n  AI答: ${aSummary}`;
        i++; // skip the assistant message
      }

      const entryTokens = estimateTokens(entry);
      if (budget - entryTokens < 0) break;
      budget -= entryTokens;
      summaryParts.push(entry);
    } else if (msg.role === "assistant" && i === 0) {
      // Standalone assistant message at start
      const aSummary = msg.content.length > 200 ? msg.content.slice(0, 200) + "..." : msg.content;
      const entry = `- AI: ${aSummary}`;
      const entryTokens = estimateTokens(entry);
      if (budget - entryTokens < 0) break;
      budget -= entryTokens;
      summaryParts.push(entry);
    }
  }

  return header + summaryParts.join("\n");
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~3 characters per token (mix of English and Chinese)
  return Math.ceil(text.length / 3);
}
