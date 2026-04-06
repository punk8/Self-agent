export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  maxContextTokens: number;
  maxOutputTokens: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface StreamChunk {
  type: "token" | "usage" | "done" | "error";
  content?: string;
  promptTokens?: number;
  completionTokens?: number;
  messageId?: string;
  error?: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  models: ModelInfo[];
  chat(params: ChatParams): AsyncGenerator<StreamChunk>;
  isAvailable(): Promise<boolean>;
}
