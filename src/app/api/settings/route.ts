import { NextRequest } from "next/server";
import { prisma, ensureDefaultUser } from "@/lib/db";
import { getCurrentUserId } from "@/lib/get-user";

export async function GET() {
  await ensureDefaultUser();
  const userId = await getCurrentUserId();

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  // Parse custom providers
  let customProviders: Array<Record<string, string>> = [];
  if (settings?.customProviders) {
    try {
      customProviders = JSON.parse(settings.customProviders);
    } catch {}
  }
  // Legacy fallback
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

  // Mask API keys in custom providers
  const maskedCustomProviders = customProviders.map((cp) => ({
    ...cp,
    apiKey: cp.apiKey ? maskKey(cp.apiKey) : "",
  }));

  let testedProviders: string[] = [];
  if (settings?.testedProviders) {
    try {
      testedProviders = JSON.parse(settings.testedProviders);
    } catch {}
  }

  return Response.json({
    openaiApiKey: settings?.openaiApiKey ? maskKey(settings.openaiApiKey) : "",
    openaiBaseUrl: settings?.openaiBaseUrl || "",
    anthropicApiKey: settings?.anthropicApiKey ? maskKey(settings.anthropicApiKey) : "",
    ollamaBaseUrl: settings?.ollamaBaseUrl || "",
    customProviders: maskedCustomProviders,
    testedProviders,
    hasOpenaiKey: !!settings?.openaiApiKey,
    hasAnthropicKey: !!settings?.anthropicApiKey,
  });
}

export async function PUT(req: NextRequest) {
  await ensureDefaultUser();
  const userId = await getCurrentUserId();
  const body = await req.json();

  const data: Record<string, string | null> = {};

  if (body.openaiApiKey !== undefined && !body.openaiApiKey.includes("••••")) {
    data.openaiApiKey = body.openaiApiKey || null;
  }
  if (body.anthropicApiKey !== undefined && !body.anthropicApiKey.includes("••••")) {
    data.anthropicApiKey = body.anthropicApiKey || null;
  }
  if (body.openaiBaseUrl !== undefined) {
    data.openaiBaseUrl = body.openaiBaseUrl || null;
  }
  if (body.ollamaBaseUrl !== undefined) {
    data.ollamaBaseUrl = body.ollamaBaseUrl || null;
  }

  // Handle custom providers array
  if (body.customProviders !== undefined) {
    // Fetch existing to resolve masked keys
    const existing = await prisma.userSettings.findUnique({ where: { userId } });
    let existingCustoms: Array<Record<string, string>> = [];
    if (existing?.customProviders) {
      try { existingCustoms = JSON.parse(existing.customProviders); } catch {}
    }

    const resolved = (body.customProviders as Array<Record<string, string>>).map((cp) => {
      if (cp.apiKey && cp.apiKey.includes("••••")) {
        // Find the original key
        const orig = existingCustoms.find((e) => e.id === cp.id);
        return { ...cp, apiKey: orig?.apiKey || "" };
      }
      return cp;
    });
    data.customProviders = JSON.stringify(resolved);
  }

  if (body.testedProviders !== undefined) {
    data.testedProviders = JSON.stringify(body.testedProviders);
  }

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return Response.json({ success: true });
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}
