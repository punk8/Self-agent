import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;

  const annotations = await prisma.annotation.findMany({
    where: { messageId },
    orderBy: { startOffset: "asc" },
  });

  return Response.json({ annotations });
}
