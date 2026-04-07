import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/llm/model-router";
import { getUserApiKeys } from "@/lib/llm/get-api-keys";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const keys = await getUserApiKeys();
  const body = await req.json();
  const { annotationId, question, model } = body;

  if (!annotationId || !question) {
    return Response.json({ error: "annotationId and question are required" }, { status: 400 });
  }

  const annotation = await prisma.annotation.findUnique({
    where: { id: annotationId },
  });

  if (!annotation) {
    return Response.json({ error: "Annotation not found" }, { status: 404 });
  }

  // Build context: original Q&A + existing follow-ups + new question
  let existingFollowUps: Array<{ question: string; answer: string }> = [];
  if (annotation.followUps) {
    try { existingFollowUps = JSON.parse(annotation.followUps); } catch {}
  }

  const contextMessages = [
    {
      role: "user" as const,
      content: `I selected this text: "${annotation.selectedText}"\n\nMy question: ${annotation.question}`,
    },
    { role: "assistant" as const, content: annotation.answer },
  ];

  for (const fu of existingFollowUps) {
    contextMessages.push({ role: "user" as const, content: fu.question });
    contextMessages.push({ role: "assistant" as const, content: fu.answer });
  }

  contextMessages.push({ role: "user" as const, content: question });

  const useModel = model || annotation.model || "gpt-4o";

  // Stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullAnswer = "";

      try {
        const gen = chat({
          model: useModel,
          messages: contextMessages,
          temperature: 0.5,
          maxTokens: 2048,
        }, keys);

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

        // Save follow-up to DB
        const updatedFollowUps = [...existingFollowUps, { question, answer: fullAnswer }];
        await prisma.annotation.update({
          where: { id: annotationId },
          data: { followUps: JSON.stringify(updatedFollowUps) },
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
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
}
