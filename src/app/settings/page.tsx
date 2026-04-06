import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/get-user";
import SettingsClient from "./settings-client";
import type { UserSettingsData, CustomProviderData } from "@/lib/api-client";

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

export default async function SettingsPage() {
  const userId = await getCurrentUserId();

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  let customProviders: CustomProviderData[] = [];
  if (settings?.customProviders) {
    try {
      customProviders = JSON.parse(settings.customProviders);
    } catch {}
  }
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

  const maskedCustomProviders = customProviders.map((cp) => ({
    ...cp,
    apiKey: cp.apiKey ? maskKey(cp.apiKey) : "",
  }));

  let testedProviders: string[] = [];
  if (settings?.testedProviders) {
    try { testedProviders = JSON.parse(settings.testedProviders); } catch {}
  }

  const initialData: UserSettingsData = {
    openaiApiKey: settings?.openaiApiKey ? maskKey(settings.openaiApiKey) : "",
    openaiBaseUrl: settings?.openaiBaseUrl || "",
    anthropicApiKey: settings?.anthropicApiKey ? maskKey(settings.anthropicApiKey) : "",
    ollamaBaseUrl: settings?.ollamaBaseUrl || "",
    customProviders: maskedCustomProviders,
    testedProviders,
    hasOpenaiKey: !!settings?.openaiApiKey,
    hasAnthropicKey: !!settings?.anthropicApiKey,
  };

  return <SettingsClient initialData={initialData} />;
}
