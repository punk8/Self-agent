import { beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaProvider } from "@/lib/llm/providers/ollama-provider";
import { responseFromChunks } from "./helpers/stream";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

async function collect<T>(iter: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const chunk of iter) out.push(chunk);
  return out;
}

describe("OllamaProvider", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("checks availability via /api/tags", async () => {
    fetchMock.mockResolvedValueOnce(new Response("ok", { status: 200 }));
    await expect(new OllamaProvider("http://ollama").isAvailable()).resolves.toBe(true);

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(new OllamaProvider("http://ollama").isAvailable()).resolves.toBe(false);
  });

  it("returns error chunk when request fails", async () => {
    fetchMock.mockResolvedValue(new Response("bad", { status: 500 }));
    const provider = new OllamaProvider("http://ollama");

    const chunks = await collect(provider.chat({ model: "qwen2.5", messages: [] }));

    expect(chunks).toEqual([{ type: "error", error: "Ollama error: 500 bad" }]);
  });

  it("returns no-body error for empty stream", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const provider = new OllamaProvider("http://ollama");

    const chunks = await collect(provider.chat({ model: "qwen2.5", messages: [] }));

    expect(chunks).toEqual([{ type: "error", error: "No response body" }]);
  });

  it("parses token stream and usage", async () => {
    fetchMock.mockResolvedValue(
      responseFromChunks([
        '{"message":{"content":"Hi"}}\n',
        'not-json\n',
        '{"message":{"content":" there"},"done":true,"prompt_eval_count":3,"eval_count":4}\n',
      ])
    );

    const provider = new OllamaProvider("http://ollama");
    const chunks = await collect(
      provider.chat({
        model: "qwen2.5",
        messages: [{ role: "user", content: "hello" }],
        temperature: 0.3,
        maxTokens: 12,
      })
    );

    expect(chunks).toEqual([
      { type: "token", content: "Hi" },
      { type: "token", content: " there" },
      { type: "usage", promptTokens: 3, completionTokens: 4 },
      { type: "done" },
    ]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.options).toEqual({ temperature: 0.3, num_predict: 12 });
  });
});
