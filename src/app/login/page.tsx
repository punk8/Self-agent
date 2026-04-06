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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!isLogin) {
        // Register first
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

      // Sign in
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Self-Agent</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin ? "登录你的账户" : "创建新账户"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1">名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="你的名称"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="至少 6 位"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLogin ? "登录" : "注册"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "没有账户？" : "已有账户？"}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="ml-1 text-primary hover:underline"
          >
            {isLogin ? "注册" : "登录"}
          </button>
        </p>
      </div>
    </div>
  );
}
