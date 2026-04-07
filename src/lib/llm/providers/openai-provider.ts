import type { LLMProvider, ChatParams, StreamChunk, ModelInfo } from "../types";
import { parseOpenAICompatibleStream } from "./stream-utils";

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
        max_tokens: params.maxTokens ?? 8192,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", error: `OpenAI API error: ${response.status} ${error}` };
      return;
    }

    yield* parseOpenAICompatibleStream(response);
  }
}
