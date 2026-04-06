import { auth } from "@/lib/auth";

export async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  return session?.user?.id || "default-user";
}
