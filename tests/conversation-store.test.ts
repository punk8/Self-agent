import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  fetchConversations: vi.fn(),
  fetchConversation: vi.fn(),
  deleteConversation: vi.fn(),
  generateTitle: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  fetchConversations: apiMocks.fetchConversations,
  fetchConversation: apiMocks.fetchConversation,
  deleteConversation: apiMocks.deleteConversation,
  generateTitle: apiMocks.generateTitle,
}));

import { useConversationStore } from "@/stores/conversation-store";

function resetStore() {
  useConversationStore.setState({
    conversations: [],
    activeConversationId: undefined,
    selectedModel: "gpt-4o",
    messages: [],
    isLoading: false,
    activeStreams: new Map(),
  });
}

describe("conversation-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it("loads conversation list", async () => {
    apiMocks.fetchConversations.mockResolvedValue([{ id: "c1", title: "T" }]);

    await useConversationStore.getState().loadConversations();

    expect(useConversationStore.getState().conversations).toEqual([{ id: "c1", title: "T" }]);
  });

  it("selects conversation from stream cache when available", async () => {
    const controller = new AbortController();
    useConversationStore.setState({
      activeStreams: new Map([
        ["c1", { abortController: controller, messages: [{ id: "a", role: "assistant", content: "cached" }] }],
      ]),
    });

    await useConversationStore.getState().selectConversation("c1");

    expect(useConversationStore.getState().messages[0].content).toBe("cached");
    expect(apiMocks.fetchConversation).not.toHaveBeenCalled();
  });

  it("selects conversation from API and maps roles", async () => {
    apiMocks.fetchConversation.mockResolvedValue({
      messages: [
        { id: "u1", role: "USER", content: "u" },
        { id: "a1", role: "ASSISTANT", content: "a" },
      ],
    });

    await useConversationStore.getState().selectConversation("c2");

    expect(useConversationStore.getState().messages).toEqual([
      { id: "u1", role: "user", content: "u" },
      { id: "a1", role: "assistant", content: "a" },
    ]);
  });

  it("handles empty conversation detail", async () => {
    apiMocks.fetchConversation.mockResolvedValue(null);

    await useConversationStore.getState().selectConversation("missing");

    expect(useConversationStore.getState().messages).toEqual([]);
    expect(useConversationStore.getState().isLoading).toBe(false);
  });

  it("starts new conversation and caches currently streaming messages", () => {
    const controller = new AbortController();
    useConversationStore.setState({
      activeConversationId: "c1",
      messages: [{ id: "a", role: "assistant", content: "draft" }],
      activeStreams: new Map([["c1", { abortController: controller, messages: [] }]]),
    });

    useConversationStore.getState().startNewConversation();

    expect(useConversationStore.getState().activeConversationId).toBeUndefined();
    expect(useConversationStore.getState().messages).toEqual([]);
    expect(useConversationStore.getState().activeStreams.get("c1")?.messages[0].content).toBe("draft");
  });

  it("removes conversation and aborts stream", async () => {
    const abortController = { abort: vi.fn() } as unknown as AbortController;
    useConversationStore.setState({
      activeConversationId: "c1",
      activeStreams: new Map([["c1", { abortController, messages: [] }]]),
    });
    apiMocks.fetchConversations.mockResolvedValue([{ id: "c2" }]);

    await useConversationStore.getState().removeConversation("c1");

    expect(abortController.abort).toHaveBeenCalled();
    expect(apiMocks.deleteConversation).toHaveBeenCalledWith("c1");
    expect(useConversationStore.getState().activeConversationId).toBeUndefined();
    expect(useConversationStore.getState().conversations).toEqual([{ id: "c2" }]);
  });

  it("manages streaming updates for active and background conversations", () => {
    const controller = new AbortController();
    useConversationStore.getState().beginStream("c1", controller, [
      { id: "m1", role: "assistant", content: "" },
    ]);

    useConversationStore.setState({
      activeConversationId: "c1",
      messages: [{ id: "m1", role: "assistant", content: "" }],
    });

    useConversationStore.getState().appendToken("c1", "hi");
    expect(useConversationStore.getState().messages[0].content).toBe("hi");

    useConversationStore.getState().finishStream("c1", "final-id");
    expect(useConversationStore.getState().messages[0]).toEqual({
      id: "final-id",
      role: "assistant",
      content: "hi",
      isStreaming: false,
    });
    expect(useConversationStore.getState().activeStreams.has("c1")).toBe(false);

    const c2Controller = new AbortController();
    useConversationStore.getState().beginStream("c2", c2Controller, [
      { id: "m2", role: "assistant", content: "bg" },
    ]);
    useConversationStore.getState().appendToken("c2", "-token");
    expect(useConversationStore.getState().activeStreams.get("c2")?.messages[0].content).toBe("bg-token");
  });

  it("handles stream errors and stopStream", () => {
    const controller = { abort: vi.fn() } as unknown as AbortController;
    useConversationStore.setState({
      activeConversationId: "c3",
      messages: [{ id: "m3", role: "assistant", content: "x", isStreaming: true }],
      activeStreams: new Map([["c3", { abortController: controller, messages: [] }]]),
    });

    useConversationStore.getState().streamError("c3", "oops");
    expect(useConversationStore.getState().messages[0].content).toBe("Error: oops");
    expect(useConversationStore.getState().activeStreams.has("c3")).toBe(false);

    const controller2 = { abort: vi.fn() } as unknown as AbortController;
    useConversationStore.setState({
      activeConversationId: "c4",
      messages: [{ id: "m4", role: "assistant", content: "run", isStreaming: true }],
      activeStreams: new Map([["c4", { abortController: controller2, messages: [] }]]),
    });

    useConversationStore.getState().stopStream("c4");
    expect(controller2.abort).toHaveBeenCalled();
    expect(useConversationStore.getState().messages[0].isStreaming).toBe(false);
  });

  it("supports convenience helpers", async () => {
    apiMocks.generateTitle.mockResolvedValue("new title");
    useConversationStore.setState({ conversations: [{ id: "c1", title: "old" }] });

    useConversationStore.getState().addUserMessage("hi user");
    useConversationStore.getState().setSelectedModel("qwen2.5");
    useConversationStore.getState().setActiveConversationId("c1");

    expect(useConversationStore.getState().messages.at(-1)?.content).toBe("hi user");
    expect(useConversationStore.getState().selectedModel).toBe("qwen2.5");
    expect(useConversationStore.getState().isConversationStreaming("c1")).toBe(false);

    await useConversationStore.getState().generateAndSetTitle("c1");
    expect(useConversationStore.getState().conversations[0].title).toBe("new title");
  });
});
