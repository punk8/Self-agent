import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.annotation.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
