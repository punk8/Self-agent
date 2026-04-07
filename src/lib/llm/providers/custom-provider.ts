import type { LLMProvider, ChatParams, StreamChunk, ModelInfo } from "../types";
import {
  parseAnthropicCompatibleStream,
  parseOpenAICompatibleStream,
} from "./stream-utils";

export type CustomApiFormat = "openai" | "anthropic";

export class CustomProvider implements LLMProvider {
  id = "custom";
  name = "Custom LLM";
  models: ModelInfo[];

  private apiKey: string;
  private baseUrl: string;
  private apiFormat: CustomApiFormat;

  constructor(apiKey?: string, baseUrl?: string, modelId?: string, modelName?: string, apiFormat?: string) {
    this.apiKey = apiKey || "";
    this.baseUrl = (baseUrl || "").replace(/\/+$/, "");
    this.apiFormat = apiFormat === "anthropic" ? "anthropic" : "openai";
    const id = modelId || "";
    const name = modelName || modelId || "Custom Model";
    this.models = id
      ? [{ id, name, provider: "custom", maxContextTokens: 128000, maxOutputTokens: 4096 }]
      : [];
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && !!this.baseUrl && this.models.length > 0;
  }

  async *chat(params: ChatParams): AsyncGenerator<StreamChunk> {
    if (this.apiFormat === "anthropic") {
      yield* this.chatAnthropic(params);
    } else {
      yield* this.chatOpenAI(params);
    }
  }

  private async *chatOpenAI(params: ChatParams): AsyncGenerator<StreamChunk> {
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
      yield { type: "error", error: `Custom LLM API error: ${response.status} ${error}` };
      return;
    }

    yield* parseOpenAICompatibleStream(response);
  }

  private async *chatAnthropic(params: ChatParams): AsyncGenerator<StreamChunk> {
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
      yield { type: "error", error: `Custom LLM API error: ${response.status} ${error}` };
      return;
    }

    yield* parseAnthropicCompatibleStream(response);
  }
}
