import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SSEEvent } from "@/lib/sse-parser";

const parseSSEStreamMock = vi.fn();

vi.mock("@/lib/sse-parser", () => ({
  parseSSEStream: parseSSEStreamMock,
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

async function collect<T>(iter: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const chunk of iter) out.push(chunk);
  return out;
}

describe("api-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    parseSSEStreamMock.mockReset();
  });

  it("sendMessage emits API error when request fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: "boom" }),
    });

    const { sendMessage } = await import("@/lib/api-client");
    const chunks = await collect(sendMessage({ content: "hello" }));

    expect(chunks).toEqual([{ type: "error", error: "boom" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sendMessage falls back to default error when json parse fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: vi.fn().mockRejectedValue(new Error("bad json")),
    });

    const { sendMessage } = await import("@/lib/api-client");
    const chunks = await collect(sendMessage({ content: "hello" }));

    expect(chunks).toEqual([{ type: "error", error: "Request failed" }]);
  });

  it("sendMessage proxies parseSSEStream output", async () => {
    const events: SSEEvent[] = [{ type: "token", content: "x" }, { type: "done" }];
    fetchMock.mockResolvedValue({ ok: true });
    parseSSEStreamMock.mockImplementation(async function* () {
      yield* events;
    });

    const { sendMessage } = await import("@/lib/api-client");
    const chunks = await collect(sendMessage({ content: "hello", model: "gpt-4o" }));

    expect(chunks).toEqual(events);
    expect(parseSSEStreamMock).toHaveBeenCalledTimes(1);
  });

  it("fetchModels returns empty array on failure", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const { fetchModels } = await import("@/lib/api-client");

    await expect(fetchModels()).resolves.toEqual([]);
  });

  it("fetchModels returns models from payload", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ models: [{ id: "m", name: "M", provider: "p" }] }),
    });
    const { fetchModels } = await import("@/lib/api-client");

    await expect(fetchModels()).resolves.toEqual([{ id: "m", name: "M", provider: "p" }]);
  });

  it("conversation APIs build expected responses", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ conversations: [{ id: "1" }] }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ id: "1", messages: [] }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ id: "2" }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ id: "3", title: "t" }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ title: "generated" }) });

    const {
      fetchConversations,
      fetchConversation,
      createConversation,
      updateConversation,
      deleteConversation,
      generateTitle,
    } = await import("@/lib/api-client");

    await expect(fetchConversations("abc")).resolves.toEqual([{ id: "1" }]);
    await expect(fetchConversation("1")).resolves.toEqual({ id: "1", messages: [] });
    await expect(createConversation("gpt-4o")).resolves.toEqual({ id: "2" });
    await expect(updateConversation("3", { title: "t" })).resolves.toEqual({ id: "3", title: "t" });
    await expect(deleteConversation("4")).resolves.toBeUndefined();
    await expect(generateTitle("5")).resolves.toBe("generated");
  });

  it("returns null or defaults for failed detail endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({}) })
      .mockResolvedValueOnce({ ok: false });

    const { fetchConversation, fetchNote, generateTitle, fetchTagDetail } = await import("@/lib/api-client");

    await expect(fetchConversation("x")).resolves.toBeNull();
    await expect(fetchNote("n1")).resolves.toBeNull();
    await expect(generateTitle("c1")).resolves.toBe("新对话");
    await expect(fetchTagDetail("t1")).resolves.toBeNull();
  });

  it("notes/tags/settings APIs map payloads", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ notes: [{ id: "n1" }] }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ id: "n1" }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ ok: true }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ tags: [{ id: "t1" }] }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ id: "t2" }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ saved: true }) });

    const {
      fetchNotes,
      fetchNote,
      exportConversationToNote,
      deleteNote,
      fetchTags,
      createTag,
      deleteTag,
      fetchSettings,
      saveSettings,
    } = await import("@/lib/api-client");

    await expect(fetchNotes({ search: "s", tagId: "t" })).resolves.toEqual([{ id: "n1" }]);
    await expect(fetchNote("n1")).resolves.toEqual({ id: "n1" });
    await expect(exportConversationToNote("c1")).resolves.toEqual({ ok: true });
    await expect(deleteNote("n2")).resolves.toBeUndefined();
    await expect(fetchTags()).resolves.toEqual([{ id: "t1" }]);
    await expect(createTag("name", "#fff")).resolves.toEqual({ id: "t2" });
    await expect(deleteTag("t3")).resolves.toBeUndefined();
    await expect(fetchSettings()).resolves.toEqual({
      openaiApiKey: "",
      openaiBaseUrl: "",
      anthropicApiKey: "",
      ollamaBaseUrl: "",
      customProviders: [],
      testedProviders: [],
      hasOpenaiKey: false,
      hasAnthropicKey: false,
    });
    await expect(saveSettings({ x: 1 })).resolves.toEqual({ saved: true });
  });
});
