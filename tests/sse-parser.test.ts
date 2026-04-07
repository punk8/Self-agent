import { describe, expect, it, vi } from "vitest";
import { parseSSEStream } from "@/lib/sse-parser";
import { responseFromChunks } from "./helpers/stream";

async function collect<T>(iter: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const chunk of iter) out.push(chunk);
  return out;
}

describe("parseSSEStream", () => {
  it("parses valid SSE JSON lines and ignores malformed lines", async () => {
    const response = responseFromChunks([
      "data: {\"type\":\"token\",\"content\":\"Hel",
      "lo\"}\n\n",
      "data: not-json\n",
      "event: ping\n",
      "data: {\"type\":\"usage\",\"promptTokens\":2,\"completionTokens\":3}\n",
      "data: [DONE]\n",
      "data: {\"type\":\"token\",\"content\":\"ignored\"}\n",
    ]);

    const events = await collect(parseSSEStream(response));

    expect(events).toEqual([
      { type: "token", content: "Hello" },
      { type: "usage", promptTokens: 2, completionTokens: 3 },
    ]);
  });

  it("throws when response body is missing", async () => {
    const response = new Response(null, { status: 200 });

    await expect(async () => collect(parseSSEStream(response))).rejects.toThrow(
      "No response body"
    );
  });

  it("always releases reader lock", async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"done"}\n') })
      .mockResolvedValueOnce({ done: true, value: undefined });
    const releaseLock = vi.fn();

    const response = {
      body: {
        getReader: () => ({ read, releaseLock }),
      },
    } as unknown as Response;

    const events = await collect(parseSSEStream(response));

    expect(events).toEqual([{ type: "done" }]);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });
});
