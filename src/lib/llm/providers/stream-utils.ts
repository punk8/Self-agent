import type { StreamChunk } from "../types";

const NO_RESPONSE_BODY_ERROR = "No response body";

type OpenAIStreamEvent = {
  choices?: Array<{ delta?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

type AnthropicStreamEvent = {
  type?: string;
  delta?: { text?: string };
  message?: { usage?: { input_tokens?: number } };
  usage?: { output_tokens?: number };
};

type OllamaStreamEvent = {
  message?: { content?: string };
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
};

function isNoResponseBodyError(error: unknown): boolean {
  return error instanceof Error && error.message === NO_RESPONSE_BODY_ERROR;
}

export async function* iterateStreamLines(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error(NO_RESPONSE_BODY_ERROR);
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        yield line;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* iterateSSEData(response: Response): AsyncGenerator<string> {
  for await (const line of iterateStreamLines(response)) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data: ")) continue;
    yield trimmed.slice(6);
  }
}

export function parseJsonSafely<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

export async function* parseOpenAICompatibleStream(
  response: Response
): AsyncGenerator<StreamChunk> {
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    for await (const data of iterateSSEData(response)) {
      if (data === "[DONE]") continue;
      const json = parseJsonSafely<OpenAIStreamEvent>(data);
      if (!json) continue;

      const delta = json.choices?.[0]?.delta;
      if (delta?.content) {
        yield { type: "token", content: delta.content };
      }
      if (json.usage) {
        promptTokens = json.usage.prompt_tokens || 0;
        completionTokens = json.usage.completion_tokens || 0;
      }
    }
  } catch (error) {
    if (isNoResponseBodyError(error)) {
      yield { type: "error", error: NO_RESPONSE_BODY_ERROR };
      return;
    }
    throw error;
  }

  yield { type: "usage", promptTokens, completionTokens };
  yield { type: "done" };
}

export async function* parseAnthropicCompatibleStream(
  response: Response
): AsyncGenerator<StreamChunk> {
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    for await (const data of iterateSSEData(response)) {
      const json = parseJsonSafely<AnthropicStreamEvent>(data);
      if (!json) continue;

      if (json.type === "content_block_delta" && json.delta?.text) {
        yield { type: "token", content: json.delta.text };
      } else if (json.type === "message_start" && json.message?.usage) {
        promptTokens = json.message.usage.input_tokens || 0;
      } else if (json.type === "message_delta" && json.usage) {
        completionTokens = json.usage.output_tokens || 0;
      }
    }
  } catch (error) {
    if (isNoResponseBodyError(error)) {
      yield { type: "error", error: NO_RESPONSE_BODY_ERROR };
      return;
    }
    throw error;
  }

  yield { type: "usage", promptTokens, completionTokens };
  yield { type: "done" };
}

export async function* parseOllamaStream(
  response: Response
): AsyncGenerator<StreamChunk> {
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    for await (const line of iterateStreamLines(response)) {
      if (!line.trim()) continue;
      const json = parseJsonSafely<OllamaStreamEvent>(line);
      if (!json) continue;

      if (json.message?.content) {
        yield { type: "token", content: json.message.content };
      }
      if (json.done) {
        promptTokens = json.prompt_eval_count || 0;
        completionTokens = json.eval_count || 0;
      }
    }
  } catch (error) {
    if (isNoResponseBodyError(error)) {
      yield { type: "error", error: NO_RESPONSE_BODY_ERROR };
      return;
    }
    throw error;
  }

  yield { type: "usage", promptTokens, completionTokens };
  yield { type: "done" };
}
