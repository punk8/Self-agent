import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { modelRouter } from "@/lib/llm/model-router";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 4,
      },
    },
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (conversation.title) {
    return Response.json({ title: conversation.title });
  }

  // Use the first few messages to generate a title
  const context = conversation.messages
    .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
    .join("\n");

  let title = "新对话";

  try {
    const gen = modelRouter.chat({
      model: conversation.model,
      messages: [
        {
          role: "user",
          content: `Based on this conversation, generate a very short title (max 30 characters, in the conversation's language). Only output the title, nothing else.\n\n${context}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 50,
    });

    let result = "";
    for await (const chunk of gen) {
      if (chunk.type === "token" && chunk.content) {
        result += chunk.content;
      }
    }

    title = result.trim().replace(/^["']|["']$/g, "").slice(0, 50) || "新对话";
  } catch {
    // Fall back to first message
    const firstUserMsg = conversation.messages.find((m) => m.role === "USER");
    if (firstUserMsg) {
      title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? "..." : "");
    }
  }

  await prisma.conversation.update({
    where: { id },
    data: { title },
  });

  return Response.json({ title });
}
