import type { LLMProvider, ChatParams, StreamChunk, ModelInfo } from "../types";
import { parseOllamaStream } from "./stream-utils";

export class OllamaProvider implements LLMProvider {
  id = "ollama";
  name = "Ollama (Local)";
  models: ModelInfo[] = [
    { id: "llama3.1", name: "Llama 3.1", provider: "ollama", maxContextTokens: 8192, maxOutputTokens: 2048 },
    { id: "qwen2.5", name: "Qwen 2.5", provider: "ollama", maxContextTokens: 32768, maxOutputTokens: 4096 },
  ];

  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async *chat(params: ChatParams): AsyncGenerator<StreamChunk> {
    const messages = params.systemPrompt
      ? [{ role: "system" as const, content: params.systemPrompt }, ...params.messages]
      : params.messages;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: params.model,
        messages,
        stream: true,
        options: {
          temperature: params.temperature ?? 0.7,
          num_predict: params.maxTokens ?? 8192,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", error: `Ollama error: ${response.status} ${error}` };
      return;
    }

    yield* parseOllamaStream(response);
  }
}
