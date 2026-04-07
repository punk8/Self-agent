import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnthropicProvider } from "@/lib/llm/providers/anthropic-provider";
import { responseFromChunks } from "./helpers/stream";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

async function collect<T>(iter: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const chunk of iter) out.push(chunk);
  return out;
}

describe("AnthropicProvider", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("is available only when api key exists", async () => {
    await expect(new AnthropicProvider("x").isAvailable()).resolves.toBe(true);
    await expect(new AnthropicProvider("").isAvailable()).resolves.toBe(false);
  });

  it("returns error chunk on non-ok response", async () => {
    fetchMock.mockResolvedValue(new Response("bad", { status: 401 }));

    const chunks = await collect(
      new AnthropicProvider("k", "https://anthropic").chat({ model: "claude", messages: [] })
    );

    expect(chunks).toEqual([
      { type: "error", error: "Anthropic API error: 401 bad" },
    ]);
  });

  it("returns no-body error when stream is empty", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const chunks = await collect(
      new AnthropicProvider("k", "https://anthropic").chat({ model: "claude", messages: [] })
    );

    expect(chunks).toEqual([{ type: "error", error: "No response body" }]);
  });

  it("streams tokens and usage updates", async () => {
    fetchMock.mockResolvedValue(
      responseFromChunks([
        'data: {"type":"message_start","message":{"usage":{"input_tokens":5}}}\n',
        'data: {"type":"content_block_delta","delta":{"text":"hello"}}\n',
        'data: malformed\n',
        'data: {"type":"message_delta","usage":{"output_tokens":9}}\n',
      ])
    );

    const provider = new AnthropicProvider("k", "https://anthropic.example");
    const chunks = await collect(
      provider.chat({
        model: "claude-sonnet",
        messages: [
          { role: "system", content: "ignore" },
          { role: "user", content: "Q" },
        ],
        systemPrompt: "sys",
      })
    );

    expect(chunks).toEqual([
      { type: "token", content: "hello" },
      { type: "usage", promptTokens: 5, completionTokens: 9 },
      { type: "done" },
    ]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(body.system).toBe("sys");
    expect(body.messages).toEqual([{ role: "user", content: "Q" }]);
  });
});
