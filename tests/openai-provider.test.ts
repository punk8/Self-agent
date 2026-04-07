import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAIProvider } from "@/lib/llm/providers/openai-provider";
import { responseFromChunks } from "./helpers/stream";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

async function collect<T>(iter: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const chunk of iter) out.push(chunk);
  return out;
}

describe("OpenAIProvider", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("is available only when api key exists", async () => {
    await expect(new OpenAIProvider("key").isAvailable()).resolves.toBe(true);
    await expect(new OpenAIProvider("").isAvailable()).resolves.toBe(false);
  });

  it("returns error chunk when API call fails", async () => {
    fetchMock.mockResolvedValue(new Response("bad request", { status: 400 }));
    const provider = new OpenAIProvider("k", "https://openai.example/v1");

    const chunks = await collect(provider.chat({ model: "gpt-4o", messages: [] }));

    expect(chunks).toEqual([
      { type: "error", error: "OpenAI API error: 400 bad request" },
    ]);
  });

  it("returns no-body error when stream body is missing", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const provider = new OpenAIProvider("k", "https://openai.example/v1");

    const chunks = await collect(provider.chat({ model: "gpt-4o", messages: [] }));

    expect(chunks).toEqual([{ type: "error", error: "No response body" }]);
  });

  it("streams token chunks then emits usage and done", async () => {
    fetchMock.mockResolvedValue(
      responseFromChunks([
        "data: {\"choices\":[{\"delta\":{\"content\":\"Hel\"}}]}\n",
        "data: not-json\n",
        "data: {\"choices\":[{\"delta\":{\"content\":\"lo\"}}],\"usage\":{\"prompt_tokens\":7,\"completion_tokens\":9}}\n",
        "data: [DONE]\n",
      ])
    );

    const provider = new OpenAIProvider("key-1", "https://openai.example/v1");
    const chunks = await collect(
      provider.chat({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hi" }],
        systemPrompt: "You are helpful",
        temperature: 0.2,
        maxTokens: 123,
      })
    );

    expect(chunks).toEqual([
      { type: "token", content: "Hel" },
      { type: "token", content: "lo" },
      { type: "usage", promptTokens: 7, completionTokens: 9 },
      { type: "done" },
    ]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(body.messages[0]).toEqual({ role: "system", content: "You are helpful" });
    expect(body.messages[1]).toEqual({ role: "user", content: "Hi" });
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(123);
  });
});
