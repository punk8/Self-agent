import type { LLMProvider, ChatParams, StreamChunk, ModelInfo } from "./types";
import { OpenAIProvider } from "./providers/openai-provider";
import { OllamaProvider } from "./providers/ollama-provider";

class ModelRouter {
  private providers: Map<string, LLMProvider> = new Map();
  private modelToProvider: Map<string, string> = new Map();

  constructor() {
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new OllamaProvider());
  }

  private registerProvider(provider: LLMProvider) {
    this.providers.set(provider.id, provider);
    for (const model of provider.models) {
      this.modelToProvider.set(model.id, provider.id);
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        models.push(...provider.models);
      }
    }
    return models;
  }

  async *chat(params: ChatParams): AsyncGenerator<StreamChunk> {
    const providerId = this.modelToProvider.get(params.model);
    if (!providerId) {
      yield { type: "error", error: `Unknown model: ${params.model}` };
      return;
    }

    const provider = this.providers.get(providerId);
    if (!provider) {
      yield { type: "error", error: `Provider not found: ${providerId}` };
      return;
    }

    if (!(await provider.isAvailable())) {
      yield { type: "error", error: `Provider ${provider.name} is not available` };
      return;
    }

    yield* provider.chat(params);
  }

  getModelInfo(modelId: string): ModelInfo | undefined {
    for (const provider of this.providers.values()) {
      const model = provider.models.find((m) => m.id === modelId);
      if (model) return model;
    }
    return undefined;
  }
}

// Singleton
const globalForRouter = globalThis as unknown as { modelRouter: ModelRouter | undefined };
export const modelRouter = globalForRouter.modelRouter ?? new ModelRouter();
if (process.env.NODE_ENV !== "production") globalForRouter.modelRouter = modelRouter;
