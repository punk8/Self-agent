import type { LLMProvider, ChatParams, StreamChunk, ModelInfo } from "../types";

export class OpenAIProvider implements LLMProvider {
  id = "openai";
  name = "OpenAI";
  models: ModelInfo[] = [
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", maxContextTokens: 128000, maxOutputTokens: 4096 },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", maxContextTokens: 128000, maxOutputTokens: 4096 },
  ];

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async *chat(params: ChatParams): AsyncGenerator<StreamChunk> {
    const messages = params.systemPrompt
      ? [{ role: "system" as const, content: params.systemPrompt }, ...params.messages]
      : params.messages;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", error: `OpenAI API error: ${response.status} ${error}` };
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
          if (data === "[DONE]") continue;

          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            if (delta?.content) {
              yield { type: "token", content: delta.content };
            }
            if (json.usage) {
              promptTokens = json.usage.prompt_tokens || 0;
              completionTokens = json.usage.completion_tokens || 0;
            }
          } catch {
            // skip malformed JSON
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
