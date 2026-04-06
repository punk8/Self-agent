import type { LLMProvider, ChatParams, StreamChunk, ModelInfo } from "../types";

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
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              yield { type: "token", content: json.message.content };
            }
            if (json.done) {
              promptTokens = json.prompt_eval_count || 0;
              completionTokens = json.eval_count || 0;
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
