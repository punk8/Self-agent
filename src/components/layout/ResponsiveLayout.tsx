"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResponsiveLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function ResponsiveLayout({ sidebar, children }: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar-background md:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-sidebar-border bg-sidebar-background">
            <div className="flex items-center justify-end p-2">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center border-b border-border p-2 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-2 text-sm font-semibold">Self-Agent</span>
        </header>
        {children}
      </main>
    </div>
  );
}
