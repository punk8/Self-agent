import { parseSSEStream, type SSEEvent } from "./sse-parser";

// --- Chat ---

interface SendMessageParams {
  conversationId?: string;
  content: string;
  model?: string;
}

export async function* sendMessage(
  params: SendMessageParams
): AsyncGenerator<SSEEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    yield { type: "error", error: err.error || `HTTP ${response.status}` };
    return;
  }

  yield* parseSSEStream(response);
}

// --- Models ---

export async function fetchModels() {
  const res = await fetch("/api/models");
  if (!res.ok) return [];
  const data = await res.json();
  return data.models as Array<{ id: string; name: string; provider: string }>;
}

// --- Conversations ---

export interface ConversationSummary {
  id: string;
  title: string | null;
  model: string;
  updatedAt: string;
  _count: { messages: number };
}

export interface ConversationDetail {
  id: string;
  title: string | null;
  model: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    model: string | null;
    createdAt: string;
  }>;
}

export async function fetchConversations(search?: string): Promise<ConversationSummary[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const res = await fetch(`/api/conversations?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.conversations;
}

export async function fetchConversation(id: string): Promise<ConversationDetail | null> {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createConversation(model?: string) {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
  return res.json();
}

export async function updateConversation(id: string, data: { title?: string; isArchived?: boolean }) {
  const res = await fetch(`/api/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteConversation(id: string) {
  await fetch(`/api/conversations/${id}`, { method: "DELETE" });
}

export async function generateTitle(conversationId: string): Promise<string> {
  const res = await fetch(`/api/conversations/${conversationId}/title`, { method: "POST" });
  const data = await res.json();
  return data.title || "新对话";
}
