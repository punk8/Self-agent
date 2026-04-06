"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { saveSettings, type CustomProviderData, type UserSettingsData } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, EyeOff, Check, Loader2, Zap, Plus, Trash2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PROVIDER_DRAWER_ANIMATION_MS = 260;

function CompactHint({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+0.7rem)] top-1/2 z-30 hidden -translate-y-1/2 rounded-full border border-border/70 bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--paper-shadow-soft)] backdrop-blur group-hover:block">
      {label}
    </span>
  );
}

interface ProviderEntry {
  id: string;
  type: "builtin" | "custom";
  name: string;
  icon: string;
  tested: boolean;
  // builtin fields
  apiKey?: string;
  baseUrl?: string;
  // custom fields
  customData?: CustomProviderData;
}

function buildProviders(data: UserSettingsData): ProviderEntry[] {
  const tested = new Set(data.testedProviders || []);
  const entries: ProviderEntry[] = [
    {
      id: "openai", type: "builtin", name: "OpenAI", icon: "🤖",
      tested: tested.has("openai"),
      apiKey: data.openaiApiKey, baseUrl: data.openaiBaseUrl,
    },
    {
      id: "anthropic", type: "builtin", name: "Anthropic", icon: "🅰️",
      tested: tested.has("anthropic"),
      apiKey: data.anthropicApiKey,
    },
    {
      id: "ollama", type: "builtin", name: "Ollama", icon: "🦙",
      tested: tested.has("ollama"),
      baseUrl: data.ollamaBaseUrl,
    },
  ];
  for (const cp of data.customProviders || []) {
    entries.push({
      id: cp.id, type: "custom", name: cp.modelName || cp.name || "Custom",
      icon: "⚡", tested: tested.has(cp.id), customData: cp,
    });
  }
  return entries;
}

export default function SettingsPage({ initialData }: { initialData: UserSettingsData }) {
  const [providers, setProviders] = useState<ProviderEntry[]>(() => buildProviders(initialData));
  const [selectedId, setSelectedId] = useState<string>("openai");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isProviderRailCollapsed, setIsProviderRailCollapsed] = useState(false);
  const [isProviderDrawerMounted, setIsProviderDrawerMounted] = useState(false);
  const [isProviderDrawerVisible, setIsProviderDrawerVisible] = useState(false);
  const drawerCloseTimerRef = useRef<number | null>(null);

  const current = providers.find((p) => p.id === selectedId);

  const updateProvider = useCallback((id: string, updates: Partial<ProviderEntry>) => {
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const updateCustomField = useCallback((id: string, field: keyof CustomProviderData, value: string) => {
    setProviders((prev) => prev.map((p) => {
      if (p.id !== id || !p.customData) return p;
      const newData = { ...p.customData, [field]: value };
      // Sync name display
      const newName = field === "modelName" ? (value || "Custom") : p.name;
      return { ...p, name: newName, customData: newData };
    }));
  }, []);

  const renderProviderList = (compact = false, closeOnSelect = false) => (
    <>
      {providers.map((p) => (
        <button
          key={p.id}
          onClick={() => {
            setSelectedId(p.id);
            setShowKey(false);
            setTestResult(null);
            if (closeOnSelect) {
              closeProviderDrawer();
            }
          }}
          className={cn(
            "group mb-2 flex w-full items-center rounded-[1.35rem] text-sm text-left transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-accent/70 hover:shadow-[var(--paper-shadow-soft)]",
            selectedId === p.id ? "paper-card bg-accent/85 shadow-[var(--paper-shadow-soft)]" : "story-link text-muted-foreground hover:text-foreground",
            compact ? "relative justify-center px-0 py-3" : "gap-3 px-4 py-3"
          )}
          title={p.name}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(249,191,101,0.16)] text-lg">
            <span>{p.icon}</span>
          </div>
          {!compact && (
            <>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.name}</span>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {p.type === "custom" ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em]">
                      Custom
                    </span>
                  ) : (
                    <span>Provider</span>
                  )}
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span>{p.tested ? "Active" : "Not tested"}</span>
                </div>
              </div>
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  p.tested ? "bg-green-500" : "bg-muted-foreground/30"
                )}
              />
            </>
          )}
          {compact && <CompactHint label={p.name} />}
        </button>
      ))}
    </>
  );

  function addCustomProvider() {
    const id = `custom-${Date.now()}`;
    const entry: ProviderEntry = {
      id, type: "custom", name: "New Provider", icon: "⚡", tested: false,
      customData: { id, name: "", baseUrl: "", apiKey: "", modelId: "", modelName: "", apiFormat: "openai" },
    };
    setProviders((prev) => [...prev, entry]);
    setSelectedId(id);
    setTestResult(null);
    setShowKey(false);
  }

  const openProviderDrawer = useCallback(() => {
    if (drawerCloseTimerRef.current) {
      window.clearTimeout(drawerCloseTimerRef.current);
      drawerCloseTimerRef.current = null;
    }
    setIsProviderDrawerMounted(true);
  }, []);

  const closeProviderDrawer = useCallback(() => {
    setIsProviderDrawerVisible(false);
    if (drawerCloseTimerRef.current) {
      window.clearTimeout(drawerCloseTimerRef.current);
    }
    drawerCloseTimerRef.current = window.setTimeout(() => {
      setIsProviderDrawerMounted(false);
      drawerCloseTimerRef.current = null;
    }, PROVIDER_DRAWER_ANIMATION_MS);
  }, []);

  useEffect(() => {
    if (!isProviderDrawerMounted) return;

    const animationFrame = window.requestAnimationFrame(() => {
      setIsProviderDrawerVisible(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isProviderDrawerMounted]);

  useEffect(() => {
    return () => {
      if (drawerCloseTimerRef.current) {
        window.clearTimeout(drawerCloseTimerRef.current);
      }
    };
  }, []);

  function removeCustomProvider(id: string) {
    setProviders((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId("openai");
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const openai = providers.find((p) => p.id === "openai");
    const anthropic = providers.find((p) => p.id === "anthropic");
    const ollama = providers.find((p) => p.id === "ollama");
    const customs = providers.filter((p) => p.type === "custom").map((p) => p.customData!);
    const tested = providers.filter((p) => p.tested).map((p) => p.id);

    await saveSettings({
      openaiApiKey: openai?.apiKey || "",
      openaiBaseUrl: openai?.baseUrl || "",
      anthropicApiKey: anthropic?.apiKey || "",
      ollamaBaseUrl: ollama?.baseUrl || "",
      customProviders: customs,
      testedProviders: tested,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    if (!current) return;
    setTesting(true);
    setTestResult(null);

    let payload: Record<string, string | undefined> = {};

    if (current.type === "custom" && current.customData) {
      payload = {
        providerId: current.id,
        baseUrl: current.customData.baseUrl,
        apiKey: current.customData.apiKey,
        modelId: current.customData.modelId,
        apiFormat: current.customData.apiFormat,
      };
    } else if (current.id === "openai") {
      payload = {
        providerId: "openai",
        baseUrl: current.baseUrl || "https://api.openai.com/v1",
        apiKey: current.apiKey,
        modelId: "gpt-4o",
        apiFormat: "openai",
      };
    } else if (current.id === "anthropic") {
      payload = {
        providerId: "anthropic",
        baseUrl: "https://api.anthropic.com",
        apiKey: current.apiKey,
        modelId: "claude-haiku-4-5-20251001",
        apiFormat: "anthropic",
      };
    } else if (current.id === "ollama") {
      payload = {
        providerId: "ollama",
        baseUrl: current.baseUrl || "http://localhost:11434",
      };
    }

    try {
      const res = await fetch("/api/settings/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const success = !!data.success;
      setTestResult({ success, message: success ? data.reply : data.error });
      updateProvider(current.id, { tested: success });
    } catch {
      setTestResult({ success: false, message: "连接失败" });
      updateProvider(current.id, { tested: false });
    }
    setTesting(false);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-transparent p-2 md:p-4">
      {isProviderDrawerMounted && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className={cn(
              "absolute inset-0 bg-[#16160f]/30 backdrop-blur-sm transition-opacity duration-300",
              isProviderDrawerVisible ? "opacity-100" : "opacity-0"
            )}
            onClick={closeProviderDrawer}
          />
          <aside
            className={cn(
              "paper-panel absolute inset-y-3 left-3 w-[18rem] overflow-hidden rounded-[1.75rem] transition-[transform,opacity] duration-300 ease-out",
              isProviderDrawerVisible ? "translate-x-0 opacity-100" : "-translate-x-[105%] opacity-0"
            )}
          >
            <div className="px-4 pb-3 pt-5">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">Providers</p>
                  <h2 className="font-display text-[2rem] leading-none">Models</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeProviderDrawer}
                  className="bg-background/50 backdrop-blur"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="scrollbar-thin h-[calc(100%-200px)] overflow-y-auto px-3 pb-4">
              {renderProviderList(false, true)}
            </div>
            <div className="border-t border-sidebar-border/80 px-4 py-4">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Actions</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full gap-2"
                onClick={() => {
                  addCustomProvider();
                  closeProviderDrawer();
                }}
              >
                <Plus className="h-3.5 w-3.5" /> 添加 Custom Provider
              </Button>
            </div>
          </aside>
        </div>
      )}

      <aside
        className={cn(
          "paper-panel hidden shrink-0 overflow-visible rounded-[2rem] transition-[width] duration-300 md:block",
          isProviderRailCollapsed ? "w-[5.5rem]" : "w-[19.5rem]"
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn("px-4 pb-3 pt-5", isProviderRailCollapsed && "px-3 pt-5")}>
            {isProviderRailCollapsed ? (
              <div className="mb-4 flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsProviderRailCollapsed((v) => !v)}
                  className="bg-background/50 backdrop-blur"
                  title={isProviderRailCollapsed ? "展开模型栏" : "收起模型栏"}
                >
                  {isProviderRailCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="relative mb-5">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">Providers</p>
                  <h2 className="font-display text-[2rem] leading-none">Models</h2>
                </div>
                <div className="absolute right-0 top-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsProviderRailCollapsed((v) => !v)}
                    className="bg-background/50 backdrop-blur"
                    title="收起模型栏"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div
            className={cn(
              "scrollbar-thin flex-1 overflow-y-auto pb-4",
              isProviderRailCollapsed ? "overflow-x-visible px-2" : "px-3"
            )}
          >
            {renderProviderList(isProviderRailCollapsed)}
          </div>
          <div className={cn("border-t border-sidebar-border/80 px-4 py-4", isProviderRailCollapsed && "px-3")}>
            {!isProviderRailCollapsed && (
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">Actions</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "group relative mt-2 gap-2",
                isProviderRailCollapsed ? "w-full justify-center px-0" : "w-full justify-start"
              )}
              onClick={addCustomProvider}
              title="添加 Custom Provider"
            >
              <Plus className="h-3.5 w-3.5" />
              {!isProviderRailCollapsed && "添加 Custom Provider"}
              {isProviderRailCollapsed && <CompactHint label="添加 Custom Provider" />}
            </Button>
          </div>
        </div>
      </aside>

      <div className="paper-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] md:ml-4">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={openProviderDrawer}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">模型配置</h1>
          <div className="ml-auto flex items-center gap-2">
            {saved && <span className="text-sm text-green-600">已保存</span>}
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saved ? <Check className="mr-2 h-4 w-4" /> : null}
              {saved ? "已保存" : "保存"}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col">
        {/* Mobile provider summary */}
        <div className="border-b border-border px-3 py-2 md:hidden">
          <button
            onClick={openProviderDrawer}
            className="inline-flex items-center rounded-full border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground"
          >
            当前: {current?.name ?? "Provider"} · 点此切换
          </button>
        </div>

        {/* Detail panel */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {current && (
            <div className="mx-auto max-w-lg space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <span className="text-2xl">{current.icon}</span>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{current.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {current.type === "custom" && (
                      <span className="text-xs rounded bg-muted px-1.5 py-0.5">CUSTOM</span>
                    )}
                    {current.tested && (
                      <span className="text-xs rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    )}
                  </div>
                </div>
                {current.type === "custom" && (
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeCustomProvider(current.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* OpenAI */}
              {current.id === "openai" && (
                <div className="space-y-4">
                  <FieldGroup label="API Key">
                    <KeyInput value={current.apiKey || ""} onChange={(v) => updateProvider("openai", { apiKey: v })}
                      show={showKey} onToggle={() => setShowKey(!showKey)} placeholder="sk-..." />
                  </FieldGroup>
                  <FieldGroup label="Base URL" hint="可选，用于代理">
                    <TextInput value={current.baseUrl || ""} onChange={(v) => updateProvider("openai", { baseUrl: v })}
                      placeholder="https://api.openai.com/v1" />
                  </FieldGroup>
                </div>
              )}

              {/* Anthropic */}
              {current.id === "anthropic" && (
                <div className="space-y-4">
                  <FieldGroup label="API Key">
                    <KeyInput value={current.apiKey || ""} onChange={(v) => updateProvider("anthropic", { apiKey: v })}
                      show={showKey} onToggle={() => setShowKey(!showKey)} placeholder="sk-ant-..." />
                  </FieldGroup>
                </div>
              )}

              {/* Ollama */}
              {current.id === "ollama" && (
                <div className="space-y-4">
                  <FieldGroup label="Base URL">
                    <TextInput value={current.baseUrl || ""} onChange={(v) => updateProvider("ollama", { baseUrl: v })}
                      placeholder="http://localhost:11434" />
                  </FieldGroup>
                  <p className="text-xs text-muted-foreground">需要本地安装并启动 Ollama 服务。</p>
                </div>
              )}

              {/* Custom */}
              {current.type === "custom" && current.customData && (
                <div className="space-y-4">
                  <FieldGroup label="API Format">
                    <div className="flex gap-2">
                      {(["openai", "anthropic"] as const).map((fmt) => (
                        <button key={fmt} type="button"
                          onClick={() => updateCustomField(current.id, "apiFormat", fmt)}
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                            current.customData!.apiFormat === fmt
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background text-muted-foreground hover:bg-accent"
                          )}>
                          {fmt === "openai" ? "OpenAI 兼容" : "Anthropic 兼容"}
                        </button>
                      ))}
                    </div>
                  </FieldGroup>
                  <FieldGroup label="Provider Name" hint="显示名称">
                    <TextInput value={current.customData.modelName}
                      onChange={(v) => updateCustomField(current.id, "modelName", v)}
                      placeholder="MiniMax" />
                  </FieldGroup>
                  <FieldGroup label="Base URL">
                    <TextInput value={current.customData.baseUrl}
                      onChange={(v) => updateCustomField(current.id, "baseUrl", v)}
                      placeholder={current.customData.apiFormat === "anthropic" ? "https://api.minimaxi.com/anthropic" : "https://api.deepseek.com/v1"} />
                  </FieldGroup>
                  <FieldGroup label="API Key">
                    <KeyInput value={current.customData.apiKey}
                      onChange={(v) => updateCustomField(current.id, "apiKey", v)}
                      show={showKey} onToggle={() => setShowKey(!showKey)} placeholder="sk-..." />
                  </FieldGroup>
                  <FieldGroup label="Model ID">
                    <TextInput value={current.customData.modelId}
                      onChange={(v) => updateCustomField(current.id, "modelId", v)}
                      placeholder="deepseek-chat" />
                  </FieldGroup>
                </div>
              )}

              {/* Test Connection - for ALL providers */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" disabled={testing} onClick={handleTest}>
                    {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                    测试连接
                  </Button>
                  {testResult && (
                    <span className={cn("text-sm max-w-[300px]", testResult.success ? "text-green-600" : "text-red-500")}>
                      {testResult.success ? `✓ ${testResult.message.slice(0, 100)}` : testResult.message.slice(0, 150)}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  只有通过测试连接的模型才会在聊天中显示为可用。
                </p>
              </div>
            </div>
          )}
        </main>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}
        {hint && <span className="ml-1 text-xs text-muted-foreground">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
  );
}

function KeyInput({ value, onChange, show, onToggle, placeholder }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string;
}) {
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <button type="button" onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
