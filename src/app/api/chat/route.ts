import { NextRequest } from "next/server";
import { chat, getModelInfo } from "@/lib/llm/model-router";
import { getUserApiKeys } from "@/lib/llm/get-api-keys";
import { buildContext } from "@/lib/llm/context-manager";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/get-user";
import type { ChatMessage } from "@/lib/llm/types";

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const keys = await getUserApiKeys();
    const body = await req.json();
    const { conversationId, content, model = "gpt-4o" } = body;

    if (!content?.trim()) {
      return Response.json({ error: "Message content is required" }, { status: 400 });
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.conversation.create({
        data: {
          model,
          userId,
        },
      });
      convId = conv.id;
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: convId,
        role: "USER",
        content: content.trim(),
      },
    });

    // Load conversation history
    const history = await prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
    });

    const modelInfo = getModelInfo(model);
    const messages: ChatMessage[] = history.map((m) => ({
      role: m.role === "USER" ? "user" as const : m.role === "ASSISTANT" ? "assistant" as const : "system" as const,
      content: m.content,
    }));

    // Build context with token limits
    const contextMessages = buildContext(messages, undefined, {
      maxTokens: modelInfo?.maxContextTokens ?? 8192,
      reserveForOutput: modelInfo?.maxOutputTokens ?? 2048,
    });

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        let promptTokens = 0;
        let completionTokens = 0;

        try {
          const gen = chat({ model, messages: contextMessages }, keys);
          for await (const chunk of gen) {
            switch (chunk.type) {
              case "token":
                fullContent += chunk.content || "";
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk.content })}\n\n`)
                );
                break;
              case "usage":
                promptTokens = chunk.promptTokens || 0;
                completionTokens = chunk.completionTokens || 0;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "usage", promptTokens, completionTokens })}\n\n`)
                );
                break;
              case "error":
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "error", error: chunk.error })}\n\n`)
                );
                break;
              case "done":
                break;
            }
          }

          // Save assistant message
          const assistantMsg = await prisma.message.create({
            data: {
              conversationId: convId,
              role: "ASSISTANT",
              content: fullContent,
              model,
              promptTokens,
              completionTokens,
            },
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", messageId: assistantMsg.id, conversationId: convId })}\n\n`)
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: errorMsg }, { status: 500 });
  }
}
