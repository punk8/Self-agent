"use client";

import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { ChatSidebar } from "./ChatSidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ResponsiveLayout renderSidebar={(props) => <ChatSidebar {...props} />}>
      {children}
    </ResponsiveLayout>
  );
}
