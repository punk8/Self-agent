import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/get-user";

export interface UserApiKeys {
  openaiApiKey: string;
  openaiBaseUrl: string;
  anthropicApiKey: string;
  ollamaBaseUrl: string;
}

export async function getUserApiKeys(): Promise<UserApiKeys> {
  const userId = await getCurrentUserId();

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  return {
    openaiApiKey: settings?.openaiApiKey || process.env.OPENAI_API_KEY || "",
    openaiBaseUrl: settings?.openaiBaseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    anthropicApiKey: settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "",
    ollamaBaseUrl: settings?.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  };
}
