import type { LLMProvider, ChatParams, StreamChunk, ModelInfo } from "../types";
import { parseAnthropicCompatibleStream } from "./stream-utils";

export class AnthropicProvider implements LLMProvider {
  id = "anthropic";
  name = "Anthropic";
  models: ModelInfo[] = [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic", maxContextTokens: 200000, maxOutputTokens: 8192 },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic", maxContextTokens: 200000, maxOutputTokens: 8192 },
  ];

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.baseUrl = baseUrl || "https://api.anthropic.com";
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async *chat(params: ChatParams): AsyncGenerator<StreamChunk> {
    // Separate system prompt from messages (Anthropic API requires it separately)
    const systemContent = params.systemPrompt || undefined;
    const messages = params.messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxTokens ?? 8192,
        ...(systemContent ? { system: systemContent } : {}),
        messages,
        temperature: params.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", error: `Anthropic API error: ${response.status} ${error}` };
      return;
    }

    yield* parseAnthropicCompatibleStream(response);
  }
}
