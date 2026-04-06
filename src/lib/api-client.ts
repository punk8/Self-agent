import { parseSSEStream, type SSEEvent } from "./sse-parser";

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

export async function fetchModels() {
  const res = await fetch("/api/models");
  if (!res.ok) return [];
  const data = await res.json();
  return data.models as Array<{ id: string; name: string; provider: string }>;
}
