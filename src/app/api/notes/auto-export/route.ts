import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/get-user";
import { chat } from "@/lib/llm/model-router";
import { getUserApiKeys } from "@/lib/llm/get-api-keys";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  const keys = await getUserApiKeys();
  const body = await req.json();
  const { conversationId } = body;

  if (!conversationId) {
    return Response.json({ error: "conversationId is required" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { annotations: true },
      },
    },
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const model = conversation.model || "gpt-4o";

  // Collect all annotations with follow-ups
  const allAnnotations = conversation.messages.flatMap((m) =>
    m.annotations.map((a) => {
      let followUps: Array<{ question: string; answer: string }> = [];
      if (a.followUps) {
        try { followUps = JSON.parse(a.followUps); } catch {}
      }
      return { selectedText: a.selectedText, question: a.question, answer: a.answer, followUps };
    })
  );

  // Check for existing note
  const existingNote = await prisma.note.findFirst({
    where: { conversationId, userId },
    include: { tags: { include: { tag: true } } },
  });

  // Find new messages since last export
  const newMessages = existingNote
    ? conversation.messages.filter((m) => m.createdAt > existingNote.updatedAt)
    : conversation.messages;

  // Build annotations text block
  const annotationsText = allAnnotations.length > 0
    ? "\n\n补充标注（用户在AI回答上划词提问的内容，也需要整合进笔记）：\n" +
      allAnnotations.map((a, i) => {
        let text = `[标注${i + 1}] 原文: "${a.selectedText}"\n提问: ${a.question}\n回答: ${a.answer}`;
        if (a.followUps.length > 0) {
          text += "\n追问:";
          for (const fu of a.followUps) {
            text += `\n  Q: ${fu.question}\n  A: ${fu.answer}`;
          }
        }
        return text;
      }).join("\n\n")
    : "";

  // No new messages AND no new annotations — return existing note as-is
  if (existingNote && newMessages.length === 0 && allAnnotations.length === 0) {
    return Response.json(existingNote, { status: 200 });
  }

  let title = "";
  let summary = "";
  let suggestedTags: string[] = [];
  let noteBody = "";

  if (existingNote && newMessages.length > 0) {
    // === INCREMENTAL: merge new content into existing note ===
    const newDialogue = newMessages
      .map((m) => `[${m.role === "USER" ? "Q" : "A"}] ${m.content}`)
      .join("\n\n")
      .slice(0, 4000);

    try {
      const result = await collectStream(chat({
        model,
        messages: [{
          role: "user",
          content: `你是专业的学习笔记整理助手。下面有一篇已有笔记和一段新的对话内容。
请将新对话中的知识增量合并到已有笔记中。

规则：
- 保留已有笔记的结构和内容，在合适的章节补充新知识
- 如果新内容引入了新的主题，可以增加新的章节
- 更新摘要和标签以反映新增内容
- 不要出现对话痕迹（"用户问""AI答"等）
- 保留所有有价值的代码片段和公式

严格按以下格式输出：

---META---
TITLE: （更新后的标题，不超过20字）
SUMMARY: （更新后的2-3句摘要）
TAGS: （更新后的3-5个标签，逗号分隔）
---NOTE---
（更新后的完整笔记正文，Markdown格式，包含：核心概念、关键知识点、深入理解、注意事项、总结）

已有笔记：
${existingNote.content.slice(0, 4000)}

新增对话内容：
${newDialogue}${annotationsText.slice(0, 2000)}`,
        }],
        temperature: 0.3,
        maxTokens: 4096,
      }, keys));

      ({ title, summary, suggestedTags, noteBody } = parseResult(result));
    } catch {
      // Fallback: append new AI responses to existing note
      const newAiContent = newMessages
        .filter((m) => m.role === "ASSISTANT")
        .map((m) => m.content)
        .join("\n\n");
      noteBody = existingNote.content + "\n\n---\n\n## 补充内容\n\n" + newAiContent;
    }
  } else {
    // === FULL: first-time generation ===
    const fullDialogue = conversation.messages
      .map((m) => `[${m.role === "USER" ? "Q" : "A"}] ${m.content}`)
      .join("\n\n")
      .slice(0, 6000);

    try {
      const result = await collectStream(chat({
        model,
        messages: [{
          role: "user",
          content: `你是专业的学习笔记整理助手。将下面的对话提炼成一篇知识笔记。

严格按以下格式输出，不要偏离：

---META---
TITLE: （简洁标题，不超过20字）
SUMMARY: （2-3句核心摘要）
TAGS: （3-5个标签，用逗号分隔）
---NOTE---
## 核心概念

（用1-2段简明文字介绍主题的核心概念）

## 关键知识点

- **知识点1**：简要说明
- **知识点2**：简要说明
- **知识点3**：简要说明
（至少列3-8个关键点）

## 深入理解

（对重要或复杂的概念做详细展开，保留有价值的代码、公式、示例）

## 注意事项

- 注意点1
- 注意点2
（如果对话中有易错点或提醒）

## 总结

（3-5句话总结全文核心要点）

规则：
- 绝对不要出现"用户问""AI答""Q:""A:"等对话痕迹
- 将知识重新组织成独立的学习资料
- 保留所有有价值的代码片段和公式
- 用中文写（除非对话本身是英文）

对话内容：
${fullDialogue}${annotationsText.slice(0, 2000)}`,
        }],
        temperature: 0.3,
        maxTokens: 4096,
      }, keys));

      ({ title, summary, suggestedTags, noteBody } = parseResult(result));
    } catch {
      // Fallback
    }
  }

  // Fallbacks
  if (!title) title = existingNote?.title || conversation.title || "学习笔记";
  if (!summary) summary = existingNote?.summary || "";
  if (!noteBody) {
    noteBody = existingNote?.content || buildFallbackContent(conversation.messages);
  }

  const noteContent = noteBody.startsWith("# ") ? noteBody : `# ${title}\n\n${noteBody}`;

  // Create or find tags
  const tagRecords = await Promise.all(
    suggestedTags.map(async (name: string) => {
      const trimmed = name.trim().toLowerCase();
      if (!trimmed) return null;
      return prisma.tag.upsert({
        where: { userId_name: { userId, name: trimmed } },
        create: { name: trimmed, userId, isAutoGenerated: true },
        update: {},
      });
    })
  );

  const validTagIds = tagRecords.filter(Boolean).map((t) => t!.id);

  let note;
  if (existingNote) {
    await prisma.tagOnNote.deleteMany({ where: { noteId: existingNote.id } });
    note = await prisma.note.update({
      where: { id: existingNote.id },
      data: {
        title,
        content: noteContent,
        summary,
        tags: { create: validTagIds.map((tagId) => ({ tagId })) },
      },
      include: { tags: { include: { tag: true } } },
    });
  } else {
    note = await prisma.note.create({
      data: {
        title,
        content: noteContent,
        summary,
        conversationId,
        userId,
        tags: { create: validTagIds.map((tagId) => ({ tagId })) },
      },
      include: { tags: { include: { tag: true } } },
    });
  }

  for (const tagId of validTagIds) {
    await prisma.tagOnConversation.upsert({
      where: { conversationId_tagId: { conversationId, tagId } },
      create: { conversationId, tagId },
      update: {},
    });
  }

  return Response.json(note, { status: existingNote ? 200 : 201 });
}

// --- Helpers ---

function parseResult(raw: string) {
  let title = "";
  let summary = "";
  let suggestedTags: string[] = [];
  let noteBody = "";

  const metaMatch = raw.match(/---META---([\s\S]*?)---NOTE---/);
  if (metaMatch) {
    const meta = metaMatch[1];
    const t = meta.match(/TITLE:\s*(.+)/);
    const s = meta.match(/SUMMARY:\s*(.+)/);
    const g = meta.match(/TAGS:\s*(.+)/);
    if (t) title = t[1].trim();
    if (s) summary = s[1].trim();
    if (g) suggestedTags = g[1].split(/[,，]/).map((x) => x.trim()).filter(Boolean).slice(0, 5);

    const noteStart = raw.indexOf("---NOTE---");
    if (noteStart !== -1) noteBody = raw.slice(noteStart + "---NOTE---".length).trim();
  } else {
    noteBody = raw.trim();
  }

  return { title, summary, suggestedTags, noteBody };
}

async function collectStream(gen: AsyncGenerator<{ type: string; content?: string }>): Promise<string> {
  let result = "";
  for await (const chunk of gen) {
    if (chunk.type === "token" && chunk.content) result += chunk.content;
  }
  return result;
}

function buildFallbackContent(messages: Array<{ role: string; content: string }>): string {
  return messages
    .filter((m) => m.role === "ASSISTANT")
    .map((m) => m.content)
    .join("\n\n---\n\n");
}
