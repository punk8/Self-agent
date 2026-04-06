import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { ChatSidebar } from "./ChatSidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ResponsiveLayout sidebar={<ChatSidebar />}>
      {children}
    </ResponsiveLayout>
  );
}
