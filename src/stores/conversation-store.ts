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

interface ConversationState {
  conversations: ConversationSummary[];
  activeConversationId: string | undefined;
  selectedModel: string;
  messages: Message[];
  isStreaming: boolean;
  isLoading: boolean;

  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
  removeConversation: (id: string) => Promise<void>;
  setActiveConversationId: (id: string) => void;

  addUserMessage: (content: string) => void;
  startAssistantMessage: () => void;
  appendToAssistantMessage: (content: string) => void;
  finishAssistantMessage: (messageId: string) => void;
  setAssistantError: (error: string) => void;
  setSelectedModel: (model: string) => void;
  setIsStreaming: (streaming: boolean) => void;

  generateAndSetTitle: (conversationId: string) => Promise<void>;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: undefined,
  selectedModel: "gpt-4o",
  messages: [],
  isStreaming: false,
  isLoading: false,

  loadConversations: async () => {
    const conversations = await fetchConversations();
    set({ conversations });
  },

  selectConversation: async (id: string) => {
    set({ isLoading: true, activeConversationId: id });
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
    set({
      activeConversationId: undefined,
      messages: [],
    });
  },

  removeConversation: async (id: string) => {
    await deleteConversation(id);
    const { activeConversationId } = get();
    if (activeConversationId === id) {
      set({ activeConversationId: undefined, messages: [] });
    }
    await get().loadConversations();
  },

  setActiveConversationId: (id: string) => set({ activeConversationId: id }),

  addUserMessage: (content: string) => {
    set((state) => ({
      messages: [
        ...state.messages,
        { id: `user-${Date.now()}`, role: "user", content },
      ],
    }));
  },

  startAssistantMessage: () => {
    set((state) => ({
      messages: [
        ...state.messages,
        { id: `assistant-${Date.now()}`, role: "assistant", content: "", isStreaming: true },
      ],
    }));
  },

  appendToAssistantMessage: (content: string) => {
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        messages[messages.length - 1] = { ...last, content: last.content + content };
      }
      return { messages };
    });
  },

  finishAssistantMessage: (messageId: string) => {
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        messages[messages.length - 1] = { ...last, id: messageId, isStreaming: false };
      }
      return { messages };
    });
  },

  setAssistantError: (error: string) => {
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        messages[messages.length - 1] = { ...last, content: `Error: ${error}`, isStreaming: false };
      }
      return { messages };
    });
  },

  setSelectedModel: (model: string) => set({ selectedModel: model }),
  setIsStreaming: (streaming: boolean) => set({ isStreaming: streaming }),

  generateAndSetTitle: async (conversationId: string) => {
    const title = await generateTitle(conversationId);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, title } : c
      ),
    }));
  },
}));
