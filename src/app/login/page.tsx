"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!isLogin) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "注册失败");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(isLogin ? "邮箱或密码错误" : "注册成功，但登录失败，请重试");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen overflow-hidden px-4 py-5 md:px-6 md:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-[1500px] gap-4 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="paper-panel relative overflow-hidden rounded-[2.25rem] px-6 py-8 md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,221,181,0.42),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(255,250,244,0.75),transparent_25%)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted-foreground">A calmer workspace</p>
                <h1 className="font-display text-5xl leading-[0.92] md:text-7xl">
                  Self-Agent
                </h1>
              </div>
              <div className="paper-card hidden rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground md:block">
                Notes + chat
              </div>
            </div>

            <div className="mt-10 grid flex-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="max-w-xl">
                <p className="text-lg leading-8 text-muted-foreground md:text-xl">
                  把对话、划句提问和结构化笔记收进一个更克制、更像纸面的思考界面里。
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Conversation memory", "把临时聊天沉淀成长期知识。"],
                    ["Inline annotations", "在回答里直接提问、追问、补充。"],
                    ["Focused writing", "用更轻的界面减少控制台感。"],
                    ["Private notes", "从会话导出成可搜索的笔记库。"],
                  ].map(([title, copy]) => (
                    <div key={title} className="paper-card rounded-[1.6rem] px-4 py-4">
                      <p className="font-medium">{title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[420px]">
                <div className="paper-card float-delayed absolute right-[6%] top-[8%] w-[72%] rounded-[2rem] p-5">
                  <p className="text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground">Conversation</p>
                  <p className="mt-3 font-display text-4xl leading-none">Quiet threads.</p>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                    问题、答案和批注不再散落在几个工具里。
                  </p>
                </div>
                <div className="olive-panel float-slow absolute left-[4%] top-[36%] w-[56%] rounded-[2rem] p-5">
                  <p className="text-[0.7rem] uppercase tracking-[0.24em] text-primary-foreground/65">Annotations</p>
                  <p className="mt-3 text-xl leading-8">圈出一句话，继续往下问。</p>
                </div>
                <div className="paper-card absolute bottom-[6%] right-[10%] w-[64%] rounded-[2rem] p-5 ambient-glow">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground">Notes</span>
                    <span className="rounded-full bg-[rgba(249,191,101,0.18)] px-3 py-1 text-xs">Linked</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 rounded-full bg-[rgba(43,38,29,0.12)]" />
                    <div className="h-3 w-4/5 rounded-full bg-[rgba(43,38,29,0.1)]" />
                    <div className="h-3 w-3/5 rounded-full bg-[rgba(43,38,29,0.08)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="paper-panel relative flex items-center justify-center overflow-hidden rounded-[2.25rem] px-5 py-8 md:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,249,238,0.8),transparent_35%),radial-gradient(circle_at_85%_18%,rgba(244,201,119,0.24),transparent_22%)]" />
          <div className="relative w-full max-w-md space-y-6">
            <div className="text-center">
              <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted-foreground">Enter workspace</p>
              <h2 className="mt-3 font-display text-5xl leading-[0.94]">
                {isLogin ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {isLogin ? "登录你的账户，继续整理对话与笔记。" : "注册后即可开始构建你的私有思考档案。"}
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2 bg-background/65"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              使用 Google 登录
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-[0.2em]">
                <span className="bg-background px-3 text-muted-foreground">或</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">名称</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 w-full rounded-[1.2rem] border border-input bg-background/70 px-4 text-sm shadow-[var(--paper-shadow-soft)] focus:outline-none focus:ring-2 focus:ring-ring/60"
                    placeholder="你的名称"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 w-full rounded-[1.2rem] border border-input bg-background/70 px-4 text-sm shadow-[var(--paper-shadow-soft)] focus:outline-none focus:ring-2 focus:ring-ring/60"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 w-full rounded-[1.2rem] border border-input bg-background/70 px-4 text-sm shadow-[var(--paper-shadow-soft)] focus:outline-none focus:ring-2 focus:ring-ring/60"
                  placeholder="至少 6 位"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? "登录" : "注册"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "没有账户？" : "已有账户？"}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
                className="story-link ml-2 text-foreground"
              >
                {isLogin ? "注册" : "登录"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
