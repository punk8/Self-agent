import type { LLMProvider, ChatParams, StreamChunk, ModelInfo } from "../types";

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
        max_tokens: params.maxTokens ?? 2048,
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

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "No response body" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);

          try {
            const json = JSON.parse(data);

            if (json.type === "content_block_delta" && json.delta?.text) {
              yield { type: "token", content: json.delta.text };
            } else if (json.type === "message_start" && json.message?.usage) {
              promptTokens = json.message.usage.input_tokens || 0;
            } else if (json.type === "message_delta" && json.usage) {
              completionTokens = json.usage.output_tokens || 0;
            }
          } catch {
            // skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: "usage", promptTokens, completionTokens };
    yield { type: "done" };
  }
}
