import { NextRequest } from "next/server";
import { modelRouter } from "@/lib/llm/model-router";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, selectedText, question, startOffset, endOffset } = body;

    if (!messageId || !selectedText || !question) {
      return Response.json(
        { error: "messageId, selectedText, and question are required" },
        { status: 400 }
      );
    }

    // Get the message and its conversation context
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 10, // last 10 messages for context
            },
          },
        },
      },
    });

    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    const model = message.conversation.model || "gpt-4o";

    // Build context: conversation history + selected text + question
    const contextMessages = message.conversation.messages.map((m) => ({
      role: m.role === "USER" ? "user" as const : "assistant" as const,
      content: m.content,
    }));

    const annotationPrompt = [
      ...contextMessages,
      {
        role: "user" as const,
        content: `I selected the following text from your previous response:\n\n"${selectedText}"\n\nMy question about this text: ${question}\n\nPlease answer concisely, focusing specifically on the selected text.`,
      },
    ];

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullAnswer = "";

        try {
          const gen = modelRouter.chat({
            model,
            messages: annotationPrompt,
            temperature: 0.5,
            maxTokens: 1024,
          });

          for await (const chunk of gen) {
            if (chunk.type === "token" && chunk.content) {
              fullAnswer += chunk.content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk.content })}\n\n`)
              );
            } else if (chunk.type === "error") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", error: chunk.error })}\n\n`)
              );
            }
          }

          // Save annotation to database
          const annotation = await prisma.annotation.create({
            data: {
              messageId,
              startOffset: startOffset ?? 0,
              endOffset: endOffset ?? selectedText.length,
              selectedText,
              question,
              answer: fullAnswer,
              model,
            },
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", annotationId: annotation.id })}\n\n`)
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
