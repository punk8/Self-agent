import { NextRequest } from "next/server";
import { prisma, ensureDefaultUser } from "@/lib/db";
import { getCurrentUserId } from "@/lib/get-user";

export async function POST(req: NextRequest) {
  await ensureDefaultUser();
  const userId = await getCurrentUserId();
  const body = await req.json();
  const { providerId, baseUrl, apiKey, modelId, apiFormat } = body;

  // Resolve actual API key - if masked, fetch from DB
  let resolvedKey = apiKey || "";
  if (!resolvedKey || resolvedKey.includes("••••")) {
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    if (settings) {
      if (providerId === "openai") {
        resolvedKey = settings.openaiApiKey || process.env.OPENAI_API_KEY || "";
      } else if (providerId === "anthropic") {
        resolvedKey = settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "";
      } else if (providerId?.startsWith("custom-")) {
        // Look up in custom providers JSON
        try {
          const customs = JSON.parse(settings.customProviders || "[]");
          const cp = customs.find((c: { id: string }) => c.id === providerId);
          if (cp) resolvedKey = cp.apiKey || "";
        } catch {}
        // Legacy fallback
        if (!resolvedKey) resolvedKey = settings.customApiKey || "";
      }
    }
  }

  if (!baseUrl) {
    return Response.json({ success: false, error: "Base URL is required" }, { status: 400 });
  }

  // For Ollama, no API key needed - just check connectivity
  if (providerId === "ollama") {
    try {
      const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        await markTested(userId, providerId, true);
        const data = await res.json();
        const modelCount = data.models?.length || 0;
        return Response.json({ success: true, reply: `Connected. ${modelCount} models available.` });
      }
      return Response.json({ success: false, error: `${res.status}: ${await res.text().then(t => t.slice(0, 200))}` });
    } catch (err) {
      return Response.json({ success: false, error: err instanceof Error ? err.message : "Connection failed" });
    }
  }

  if (!resolvedKey) {
    return Response.json({ success: false, error: "API Key is required" }, { status: 400 });
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  const effectiveFormat = apiFormat || "openai";
  const effectiveModel = modelId || (providerId === "openai" ? "gpt-4o" : providerId === "anthropic" ? "claude-haiku-4-5-20251001" : "");

  if (!effectiveModel) {
    return Response.json({ success: false, error: "Model ID is required" }, { status: 400 });
  }

  try {
    let content: string;

    if (effectiveFormat === "anthropic") {
      const res = await fetch(`${cleanBaseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": resolvedKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: effectiveModel,
          max_tokens: 32,
          messages: [{ role: "user", content: "Hi, reply with just 'ok'." }],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const text = await res.text();
        return Response.json({ success: false, error: `${res.status}: ${text.slice(0, 300)}` });
      }

      const data = await res.json();
      content = data.content?.[0]?.text || JSON.stringify(data).slice(0, 200);
    } else {
      // OpenAI format
      const url = providerId === "anthropic"
        ? `${cleanBaseUrl}/v1/messages`  // shouldn't happen but safeguard
        : `${cleanBaseUrl}/chat/completions`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resolvedKey}`,
        },
        body: JSON.stringify({
          model: effectiveModel,
          max_tokens: 32,
          messages: [{ role: "user", content: "Hi, reply with just 'ok'." }],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const text = await res.text();
        return Response.json({ success: false, error: `${res.status}: ${text.slice(0, 300)}` });
      }

      const data = await res.json();
      content = data.choices?.[0]?.message?.content || JSON.stringify(data).slice(0, 200);
    }

    // Test passed - save status
    await markTested(userId, providerId, true);
    return Response.json({ success: true, reply: content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return Response.json({ success: false, error: msg });
  }
}

async function markTested(userId: string, providerId: string, passed: boolean) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  let tested: string[] = [];
  try {
    tested = JSON.parse(settings?.testedProviders || "[]");
  } catch {}

  if (passed) {
    if (!tested.includes(providerId)) tested.push(providerId);
  } else {
    tested = tested.filter((id) => id !== providerId);
  }

  await prisma.userSettings.update({
    where: { userId },
    data: { testedProviders: JSON.stringify(tested) },
  });
}
