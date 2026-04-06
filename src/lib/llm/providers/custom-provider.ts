import type { LLMProvider, ChatParams, StreamChunk, ModelInfo } from "../types";

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

    yield* this.parseOpenAIStream(response);
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

    yield* this.parseAnthropicStream(response);
  }

  private async *parseOpenAIStream(response: Response): AsyncGenerator<StreamChunk> {
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

  private async *parseAnthropicStream(response: Response): AsyncGenerator<StreamChunk> {
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
