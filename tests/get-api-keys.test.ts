import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
const getCurrentUserIdMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    userSettings: {
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("@/lib/get-user", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

describe("getUserApiKeys", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue("user-1");
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
  });

  it("returns DB settings when available", async () => {
    findUniqueMock.mockResolvedValue({
      openaiApiKey: "oa",
      openaiBaseUrl: "https://o.example",
      anthropicApiKey: "an",
      ollamaBaseUrl: "http://ollama.example",
      customProviders: JSON.stringify([
        {
          id: "cp-1",
          name: "CP",
          baseUrl: "https://cp",
          apiKey: "k",
          modelId: "m1",
          modelName: "Model 1",
          apiFormat: "openai",
        },
      ]),
      testedProviders: JSON.stringify(["openai", "cp-1"]),
    });

    const { getUserApiKeys } = await import("@/lib/llm/get-api-keys");
    const result = await getUserApiKeys();

    expect(result).toEqual({
      openaiApiKey: "oa",
      openaiBaseUrl: "https://o.example",
      anthropicApiKey: "an",
      ollamaBaseUrl: "http://ollama.example",
      customProviders: [
        {
          id: "cp-1",
          name: "CP",
          baseUrl: "https://cp",
          apiKey: "k",
          modelId: "m1",
          modelName: "Model 1",
          apiFormat: "openai",
        },
      ],
      testedProviders: ["openai", "cp-1"],
    });
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("falls back to legacy custom fields when customProviders is empty", async () => {
    findUniqueMock.mockResolvedValue({
      customProviders: "[]",
      customApiKey: "legacy-key",
      customBaseUrl: "https://legacy",
      customModelId: "legacy-model",
      customModelName: "Legacy",
      customApiFormat: "anthropic",
    });

    const { getUserApiKeys } = await import("@/lib/llm/get-api-keys");
    const result = await getUserApiKeys();

    expect(result.customProviders).toEqual([
      {
        id: "custom-1",
        name: "Legacy",
        baseUrl: "https://legacy",
        apiKey: "legacy-key",
        modelId: "legacy-model",
        modelName: "Legacy",
        apiFormat: "anthropic",
      },
    ]);
  });

  it("uses environment defaults when settings are missing or malformed", async () => {
    process.env.OPENAI_API_KEY = "env-openai";
    process.env.OPENAI_BASE_URL = "https://env.openai";
    process.env.ANTHROPIC_API_KEY = "env-anthropic";
    process.env.OLLAMA_BASE_URL = "http://env-ollama";

    findUniqueMock.mockResolvedValue({
      customProviders: "not-json",
      testedProviders: "not-json",
    });

    const { getUserApiKeys } = await import("@/lib/llm/get-api-keys");
    const result = await getUserApiKeys();

    expect(result).toEqual({
      openaiApiKey: "env-openai",
      openaiBaseUrl: "https://env.openai",
      anthropicApiKey: "env-anthropic",
      ollamaBaseUrl: "http://env-ollama",
      customProviders: [],
      testedProviders: [],
    });
  });
});
