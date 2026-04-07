import { create } from "zustand";
import {
  fetchConversations,
  fetchConversation,
  deleteConversation,
  generateTitle,
  type ConversationSummary,
} from "@/lib/api-client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

// Per-conversation streaming state
interface StreamState {
  messages: Message[];
  abortController: AbortController;
}

interface ConversationState {
  conversations: ConversationSummary[];
  activeConversationId: string | undefined;
  selectedModel: string;
  messages: Message[];
  isLoading: boolean;
  // Per-conversation stream tracking
  activeStreams: Map<string, StreamState>;

  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
  removeConversation: (id: string) => Promise<void>;
  setActiveConversationId: (id: string) => void;

  // Streaming - all keyed by conversationId
  beginStream: (convId: string, controller: AbortController, messages: Message[]) => void;
  appendToken: (convId: string, content: string) => void;
  finishStream: (convId: string, messageId: string) => void;
  streamError: (convId: string, error: string) => void;
  stopStream: (convId: string) => void;
  isConversationStreaming: (convId: string) => boolean;

  addUserMessage: (content: string) => void;
  setSelectedModel: (model: string) => void;

  generateAndSetTitle: (conversationId: string) => Promise<void>;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: undefined,
  selectedModel: "gpt-4o",
  messages: [],
  isLoading: false,
  activeStreams: new Map(),

  loadConversations: async () => {
    const conversations = await fetchConversations();
    set({ conversations });
  },

  selectConversation: async (id: string) => {
    const { activeConversationId, messages: currentMessages, activeStreams } = get();

    // Save current messages to stream cache if that conversation is streaming
    if (activeConversationId && activeStreams.has(activeConversationId)) {
      const streams = new Map(activeStreams);
      const existing = streams.get(activeConversationId)!;
      streams.set(activeConversationId, { ...existing, messages: [...currentMessages] });
      set({ activeStreams: streams });
    }

    set({ isLoading: true, activeConversationId: id });

    // If target conversation is streaming, restore from cache
    const stream = get().activeStreams.get(id);
    if (stream) {
      set({ messages: [...stream.messages], isLoading: false });
      return;
    }

    // Normal DB load
    const detail = await fetchConversation(id);
    if (detail) {
      const messages: Message[] = detail.messages.map((m) => ({
        id: m.id,
        role: m.role === "USER" ? "user" as const : "assistant" as const,
        content: m.content,
      }));
      set({ messages, isLoading: false });
    } else {
      set({ messages: [], isLoading: false });
    }
  },

  startNewConversation: () => {
    const { activeConversationId, messages: currentMessages, activeStreams } = get();
    if (activeConversationId && activeStreams.has(activeConversationId)) {
      const streams = new Map(activeStreams);
      const existing = streams.get(activeConversationId)!;
      streams.set(activeConversationId, { ...existing, messages: [...currentMessages] });
      set({ activeStreams: streams });
    }
    set({ activeConversationId: undefined, messages: [] });
  },

  removeConversation: async (id: string) => {
    // Abort if streaming
    const stream = get().activeStreams.get(id);
    if (stream) stream.abortController.abort();
    const streams = new Map(get().activeStreams);
    streams.delete(id);
    set({ activeStreams: streams });

    await deleteConversation(id);
    const { activeConversationId } = get();
    if (activeConversationId === id) {
      set({ activeConversationId: undefined, messages: [] });
    }
    await get().loadConversations();
  },

  setActiveConversationId: (id: string) => set({ activeConversationId: id }),

  // --- Per-conversation streaming ---

  beginStream: (convId: string, controller: AbortController, messages: Message[]) => {
    const streams = new Map(get().activeStreams);
    streams.set(convId, { messages: [...messages], abortController: controller });
    set({ activeStreams: streams });
  },

  appendToken: (convId: string, content: string) => {
    const { activeConversationId, activeStreams } = get();
    const isViewing = activeConversationId === convId;

    if (isViewing) {
      // Update UI directly
      set((state) => {
        const messages = [...state.messages];
        const last = messages[messages.length - 1];
        if (last?.role === "assistant") {
          messages[messages.length - 1] = { ...last, content: last.content + content };
        }
        return { messages };
      });
      // Also update cache
      const streams = new Map(activeStreams);
      const stream = streams.get(convId);
      if (stream) {
        const msgs = [...get().messages]; // already updated above
        streams.set(convId, { ...stream, messages: msgs });
        set({ activeStreams: streams });
      }
    } else {
      // Update cache only
      const streams = new Map(activeStreams);
      const stream = streams.get(convId);
      if (stream) {
        const msgs = [...stream.messages];
        const last = msgs[msgs.length - 1];
        if (last?.role === "assistant") {
          msgs[msgs.length - 1] = { ...last, content: last.content + content };
        }
        streams.set(convId, { ...stream, messages: msgs });
        set({ activeStreams: streams });
      }
    }
  },

  finishStream: (convId: string, messageId: string) => {
    const { activeConversationId } = get();
    const isViewing = activeConversationId === convId;

    if (isViewing) {
      set((state) => {
        const messages = [...state.messages];
        const last = messages[messages.length - 1];
        if (last?.role === "assistant") {
          messages[messages.length - 1] = { ...last, id: messageId, isStreaming: false };
        }
        return { messages };
      });
    }

    // Remove from active streams
    const streams = new Map(get().activeStreams);
    streams.delete(convId);
    set({ activeStreams: streams });
  },

  streamError: (convId: string, error: string) => {
    const { activeConversationId } = get();
    if (activeConversationId === convId) {
      set((state) => {
        const messages = [...state.messages];
        const last = messages[messages.length - 1];
        if (last?.role === "assistant") {
          messages[messages.length - 1] = { ...last, content: `Error: ${error}`, isStreaming: false };
        }
        return { messages };
      });
    }
    const streams = new Map(get().activeStreams);
    streams.delete(convId);
    set({ activeStreams: streams });
  },

  stopStream: (convId: string) => {
    const stream = get().activeStreams.get(convId);
    if (stream) {
      stream.abortController.abort();
      const streams = new Map(get().activeStreams);
      streams.delete(convId);
      set({ activeStreams: streams });
      // Finalize UI if viewing
      if (get().activeConversationId === convId) {
        const { messages } = get();
        const last = messages[messages.length - 1];
        if (last?.role === "assistant" && last.isStreaming) {
          set({
            messages: messages.map((m, i) =>
              i === messages.length - 1 ? { ...m, isStreaming: false } : m
            ),
          });
        }
      }
    }
  },

  isConversationStreaming: (convId: string) => {
    return get().activeStreams.has(convId);
  },

  addUserMessage: (content: string) => {
    set((state) => ({
      messages: [
        ...state.messages,
        { id: `user-${Date.now()}`, role: "user", content },
      ],
    }));
  },

  setSelectedModel: (model: string) => set({ selectedModel: model }),

  generateAndSetTitle: async (conversationId: string) => {
    const title = await generateTitle(conversationId);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, title } : c
      ),
    }));
  },
}));
