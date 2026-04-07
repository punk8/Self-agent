import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomProvider } from "@/lib/llm/providers/custom-provider";
import { responseFromChunks } from "./helpers/stream";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

async function collect<T>(iter: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const chunk of iter) out.push(chunk);
  return out;
}

describe("CustomProvider", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("normalizes constructor fields and availability", async () => {
    const provider = new CustomProvider("k", "https://base///", "m1", "Model 1", "anthropic");

    expect(provider.models[0].id).toBe("m1");
    await expect(provider.isAvailable()).resolves.toBe(true);

    const missing = new CustomProvider("", "", "", "", "openai");
    await expect(missing.isAvailable()).resolves.toBe(false);
  });

  it("returns API error on non-ok openai response", async () => {
    fetchMock.mockResolvedValue(new Response("bad", { status: 503 }));

    const provider = new CustomProvider("k", "https://base", "m1", "M1", "openai");
    const chunks = await collect(provider.chat({ model: "m1", messages: [] }));

    expect(chunks).toEqual([{ type: "error", error: "Custom LLM API error: 503 bad" }]);
  });

  it("parses openai format stream", async () => {
    fetchMock.mockResolvedValue(
      responseFromChunks([
        'data: {"choices":[{"delta":{"content":"A"}}]}\n',
        'data: {"usage":{"prompt_tokens":1,"completion_tokens":2}}\n',
        'data: [DONE]\n',
      ])
    );

    const provider = new CustomProvider("k", "https://base", "m1", "M1", "openai");
    const chunks = await collect(provider.chat({ model: "m1", messages: [{ role: "user", content: "hi" }] }));

    expect(chunks).toEqual([
      { type: "token", content: "A" },
      { type: "usage", promptTokens: 1, completionTokens: 2 },
      { type: "done" },
    ]);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://base/chat/completions");
  });

  it("returns no-body error in parser", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const provider = new CustomProvider("k", "https://base", "m1", "M1", "openai");
    const chunks = await collect(provider.chat({ model: "m1", messages: [] }));

    expect(chunks).toEqual([{ type: "error", error: "No response body" }]);
  });

  it("parses anthropic format stream", async () => {
    fetchMock.mockResolvedValue(
      responseFromChunks([
        'data: {"type":"message_start","message":{"usage":{"input_tokens":4}}}\n',
        'data: {"type":"content_block_delta","delta":{"text":"B"}}\n',
        'data: {"type":"message_delta","usage":{"output_tokens":8}}\n',
      ])
    );

    const provider = new CustomProvider("k", "https://base", "m1", "M1", "anthropic");
    const chunks = await collect(
      provider.chat({
        model: "m1",
        messages: [
          { role: "system", content: "ignore" },
          { role: "assistant", content: "prev" },
          { role: "user", content: "ask" },
        ],
        systemPrompt: "sys",
      })
    );

    expect(chunks).toEqual([
      { type: "token", content: "B" },
      { type: "usage", promptTokens: 4, completionTokens: 8 },
      { type: "done" },
    ]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(body.system).toBe("sys");
    expect(body.messages).toEqual([
      { role: "assistant", content: "prev" },
      { role: "user", content: "ask" },
    ]);
  });
});
