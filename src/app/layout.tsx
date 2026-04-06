import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-ui-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-ui-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Self-Agent",
  description: "个人笔记 Agent - AI 聊天 + 划句提问 + 智能笔记",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/15 selection:text-foreground">
        {children}
      </body>
    </html>
  );
}
