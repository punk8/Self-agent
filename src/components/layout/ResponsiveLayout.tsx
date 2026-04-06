"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResponsiveLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function ResponsiveLayout({ sidebar, children }: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent p-2 md:p-4">
      {/* Desktop sidebar */}
      <aside className="paper-panel hidden w-[19.5rem] shrink-0 overflow-hidden rounded-[2rem] md:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[#16160f]/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="paper-panel absolute inset-y-3 left-3 w-[18rem] overflow-hidden rounded-[1.75rem]">
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
      <main className="flex flex-1 flex-col overflow-hidden md:pl-4">
        {/* Mobile header */}
        <header className="paper-panel mb-2 flex items-center gap-3 rounded-[1.5rem] px-3 py-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Self-Agent</p>
            <span className="font-display text-lg leading-none">Quiet thinking</span>
          </div>
        </header>
        <div className="paper-panel flex min-h-0 flex-1 overflow-hidden rounded-[2rem]">
          {children}
        </div>
      </main>
    </div>
  );
}
