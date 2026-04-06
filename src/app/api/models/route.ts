import { modelRouter } from "@/lib/llm/model-router";

export async function GET() {
  const models = await modelRouter.getAvailableModels();
  return Response.json({ models });
}
