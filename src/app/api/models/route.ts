import { getAvailableModels } from "@/lib/llm/model-router";
import { getUserApiKeys } from "@/lib/llm/get-api-keys";

export async function GET() {
  const keys = await getUserApiKeys();
  const models = await getAvailableModels(keys);
  return Response.json({ models });
}
