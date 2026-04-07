import type { LLMProvider, ChatParams, StreamChunk, ModelInfo } from "./types";
import { OpenAIProvider } from "./providers/openai-provider";
import { OllamaProvider } from "./providers/ollama-provider";
import { AnthropicProvider } from "./providers/anthropic-provider";
import { CustomProvider } from "./providers/custom-provider";
import type { UserApiKeys } from "./get-api-keys";

function createProviders(keys: UserApiKeys): Map<string, LLMProvider> {
  const providers = new Map<string, LLMProvider>();
  const openai = new OpenAIProvider(keys.openaiApiKey, keys.openaiBaseUrl);
  const ollama = new OllamaProvider(keys.ollamaBaseUrl);
  const anthropic = new AnthropicProvider(keys.anthropicApiKey);
  providers.set(openai.id, openai);
  providers.set(ollama.id, ollama);
  providers.set(anthropic.id, anthropic);

  // Add all custom providers
  for (const cp of keys.customProviders) {
    const custom = new CustomProvider(cp.apiKey, cp.baseUrl, cp.modelId, cp.modelName, cp.apiFormat);
    // Use unique ID per custom provider to avoid collisions
    custom.id = cp.id;
    custom.name = cp.name || "Custom LLM";
    if (custom.models.length > 0) {
      custom.models[0].provider = cp.id;
    }
    providers.set(cp.id, custom);
  }

  return providers;
}

function findProviderByModel(providers: Map<string, LLMProvider>, modelId: string): LLMProvider | undefined {
  for (const provider of providers.values()) {
    if (provider.models.some((model) => model.id === modelId)) {
      return provider;
    }
  }
  return undefined;
}

// Static model list (for UI display, doesn't need keys)
const staticProviders = [new OpenAIProvider(), new OllamaProvider(), new AnthropicProvider()];

export async function getAvailableModels(keys: UserApiKeys): Promise<ModelInfo[]> {
  const providers = createProviders(keys);
  const tested = new Set(keys.testedProviders);
  const models: ModelInfo[] = [];

  for (const provider of providers.values()) {
    // Only include providers that passed testing
    if (!tested.has(provider.id)) continue;
    if (await provider.isAvailable()) {
      models.push(...provider.models);
    }
  }
  return models;
}

export async function* chat(params: ChatParams, keys: UserApiKeys): AsyncGenerator<StreamChunk> {
  const providers = createProviders(keys);
  const provider = findProviderByModel(providers, params.model);
  if (!provider) {
    yield { type: "error", error: `Unknown model: ${params.model}` };
    return;
  }

  if (!(await provider.isAvailable())) {
    yield { type: "error", error: `Provider ${provider.name} is not available. Please configure your API key in Settings.` };
    return;
  }

  yield* provider.chat(params);
}

export function getModelInfo(modelId: string): ModelInfo | undefined {
  for (const p of staticProviders) {
    const model = p.models.find((m) => m.id === modelId);
    if (model) return model;
  }
  return undefined;
}
