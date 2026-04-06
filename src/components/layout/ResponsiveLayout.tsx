"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResponsiveLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

interface InjectedSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

const DESKTOP_SIDEBAR_STORAGE_KEY = "self-agent-chat-sidebar-collapsed";

export function ResponsiveLayout({ sidebar, children }: ResponsiveLayoutProps) {
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY) === "true";
  });

  const toggleDesktopCollapsed = useCallback(() => {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  const openMobileSidebar = useCallback(() => {
    setSidebarMounted(true);
    window.requestAnimationFrame(() => setSidebarVisible(true));
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setSidebarVisible(false);
    window.setTimeout(() => setSidebarMounted(false), 220);
  }, []);

  const desktopSidebarNode = useMemo(() => {
    if (!isValidElement(sidebar)) return sidebar;

    return cloneElement(sidebar as ReactElement<InjectedSidebarProps>, {
      collapsed: desktopCollapsed,
      onToggleCollapse: toggleDesktopCollapsed,
      onNavigate: closeMobileSidebar,
    });
  }, [closeMobileSidebar, desktopCollapsed, sidebar, toggleDesktopCollapsed]);

  const mobileSidebarNode = useMemo(() => {
    if (!isValidElement(sidebar)) return sidebar;

    return cloneElement(sidebar as ReactElement<InjectedSidebarProps>, {
      collapsed: false,
      onToggleCollapse: toggleDesktopCollapsed,
      onNavigate: closeMobileSidebar,
    });
  }, [closeMobileSidebar, sidebar, toggleDesktopCollapsed]);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent p-2 md:p-4">
      {/* Desktop sidebar */}
      <aside
        className={`paper-panel relative hidden shrink-0 overflow-visible rounded-[2rem] transition-[width,transform,opacity] duration-300 ease-out md:block ${
          desktopCollapsed ? "w-[5.5rem]" : "w-[19.5rem]"
        }`}
      >
        <div className="absolute right-3 top-3 z-20 hidden md:block">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDesktopCollapsed}
            title={desktopCollapsed ? "展开会话栏" : "收起会话栏"}
            className="bg-background/50 backdrop-blur"
          >
            {desktopCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="h-full rounded-[inherit]">
          {desktopSidebarNode}
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarMounted && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className={`absolute inset-0 bg-[#16160f]/30 backdrop-blur-sm transition-opacity duration-200 ${
              sidebarVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMobileSidebar}
          />
          <aside
            className={`paper-panel absolute inset-y-3 left-3 w-[18rem] overflow-hidden rounded-[1.75rem] transition-transform duration-300 ease-out ${
              sidebarVisible ? "translate-x-0" : "-translate-x-[105%]"
            }`}
          >
            <div className="flex items-center justify-end p-2">
              <Button variant="ghost" size="icon" onClick={closeMobileSidebar}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {mobileSidebarNode}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden md:pl-4">
        {/* Mobile header */}
        <header className="paper-panel mb-2 flex items-center gap-3 rounded-[1.5rem] px-3 py-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={openMobileSidebar}>
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
