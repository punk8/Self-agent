import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/get-user";

export interface CustomProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
  modelName: string;
  apiFormat: string; // "openai" | "anthropic"
}

export interface UserApiKeys {
  openaiApiKey: string;
  openaiBaseUrl: string;
  anthropicApiKey: string;
  ollamaBaseUrl: string;
  customProviders: CustomProviderConfig[];
  testedProviders: string[]; // provider IDs that passed testing
}

export async function getUserApiKeys(): Promise<UserApiKeys> {
  const userId = await getCurrentUserId();

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  // Parse custom providers from JSON, with fallback to legacy fields
  let customProviders: CustomProviderConfig[] = [];
  if (settings?.customProviders) {
    try {
      customProviders = JSON.parse(settings.customProviders);
    } catch {}
  }
  // Fallback: if no customProviders but legacy fields exist, convert
  if (customProviders.length === 0 && settings?.customApiKey) {
    customProviders = [{
      id: "custom-1",
      name: settings.customModelName || "Custom",
      baseUrl: settings.customBaseUrl || "",
      apiKey: settings.customApiKey,
      modelId: settings.customModelId || "",
      modelName: settings.customModelName || "",
      apiFormat: settings.customApiFormat || "openai",
    }];
  }

  let testedProviders: string[] = [];
  if (settings?.testedProviders) {
    try {
      testedProviders = JSON.parse(settings.testedProviders);
    } catch {}
  }

  return {
    openaiApiKey: settings?.openaiApiKey || process.env.OPENAI_API_KEY || "",
    openaiBaseUrl: settings?.openaiBaseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    anthropicApiKey: settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "",
    ollamaBaseUrl: settings?.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    customProviders,
    testedProviders,
  };
}
