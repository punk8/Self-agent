import { NextRequest } from "next/server";
import { prisma, ensureDefaultUser } from "@/lib/db";
import { getCurrentUserId } from "@/lib/get-user";

export async function GET() {
  await ensureDefaultUser();
  const userId = await getCurrentUserId();

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  // Never return full API keys - mask them
  return Response.json({
    openaiApiKey: settings?.openaiApiKey ? maskKey(settings.openaiApiKey) : "",
    openaiBaseUrl: settings?.openaiBaseUrl || "",
    anthropicApiKey: settings?.anthropicApiKey ? maskKey(settings.anthropicApiKey) : "",
    ollamaBaseUrl: settings?.ollamaBaseUrl || "",
    hasOpenaiKey: !!settings?.openaiApiKey,
    hasAnthropicKey: !!settings?.anthropicApiKey,
  });
}

export async function PUT(req: NextRequest) {
  await ensureDefaultUser();
  const userId = await getCurrentUserId();
  const body = await req.json();

  const data: Record<string, string | null> = {};

  // Only update fields that are explicitly provided and not masked
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
