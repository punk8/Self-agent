import { afterEach, describe, expect, it, vi } from "vitest";
import { chat, getAvailableModels, getModelInfo } from "@/lib/llm/model-router";
import { OpenAIProvider } from "@/lib/llm/providers/openai-provider";
import { OllamaProvider } from "@/lib/llm/providers/ollama-provider";
import { AnthropicProvider } from "@/lib/llm/providers/anthropic-provider";
import { CustomProvider } from "@/lib/llm/providers/custom-provider";
import type { UserApiKeys } from "@/lib/llm/get-api-keys";

async function collect<T>(iter: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const chunk of iter) out.push(chunk);
  return out;
}

const baseKeys: UserApiKeys = {
  openaiApiKey: "oa",
  openaiBaseUrl: "https://openai.example/v1",
  anthropicApiKey: "an",
  ollamaBaseUrl: "http://ollama",
  customProviders: [
    {
      id: "cp-1",
      name: "Custom One",
      baseUrl: "https://custom",
      apiKey: "ck",
      modelId: "custom-model",
      modelName: "Custom Model",
      apiFormat: "openai",
    },
  ],
  testedProviders: ["openai", "cp-1"],
};

describe("model-router", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns only tested + available provider models", async () => {
    vi.spyOn(OpenAIProvider.prototype, "isAvailable").mockResolvedValue(true);
    vi.spyOn(OllamaProvider.prototype, "isAvailable").mockResolvedValue(true);
    vi.spyOn(AnthropicProvider.prototype, "isAvailable").mockResolvedValue(false);
    vi.spyOn(CustomProvider.prototype, "isAvailable").mockResolvedValue(true);

    const models = await getAvailableModels(baseKeys);
    const ids = models.map((m) => m.id);

    expect(ids).toContain("gpt-4o");
    expect(ids).toContain("custom-model");
    expect(ids).not.toContain("llama3.1");
    expect(ids).not.toContain("claude-sonnet-4-20250514");
  });

  it("yields an error when model is unknown", async () => {
    const chunks = await collect(
      chat({ model: "missing-model", messages: [] }, { ...baseKeys, customProviders: [] })
    );

    expect(chunks).toEqual([
      { type: "error", error: "Unknown model: missing-model" },
    ]);
  });

  it("yields an error when provider is unavailable", async () => {
    vi.spyOn(OpenAIProvider.prototype, "isAvailable").mockResolvedValue(false);

    const chunks = await collect(chat({ model: "gpt-4o", messages: [] }, baseKeys));

    expect(chunks).toEqual([
      {
        type: "error",
        error:
          "Provider OpenAI is not available. Please configure your API key in Settings.",
      },
    ]);
  });

  it("delegates to provider chat when available", async () => {
    vi.spyOn(OpenAIProvider.prototype, "isAvailable").mockResolvedValue(true);
    vi.spyOn(OpenAIProvider.prototype, "chat").mockImplementation(async function* () {
      yield { type: "token", content: "ok" };
      yield { type: "done" };
    });

    const chunks = await collect(chat({ model: "gpt-4o", messages: [] }, baseKeys));

    expect(chunks).toEqual([
      { type: "token", content: "ok" },
      { type: "done" },
    ]);
  });

  it("gets static model info", () => {
    expect(getModelInfo("gpt-4o")?.provider).toBe("openai");
    expect(getModelInfo("not-exist")).toBeUndefined();
  });
});
