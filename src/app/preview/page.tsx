"use client";

import { ArrowRight, CirclePlay, Sparkles } from "lucide-react";
import Link from "next/link";

export default function PreviewPage() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <section className="relative overflow-hidden rounded-[2.75rem] p-4 text-[#f7f1e8] md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_28%,rgba(255,220,155,0.2),transparent_18%),radial-gradient(circle_at_84%_18%,rgba(255,246,224,0.08),transparent_12%),radial-gradient(circle_at_74%_74%,rgba(241,171,79,0.14),transparent_18%),radial-gradient(circle_at_48%_62%,rgba(122,119,61,0.34),transparent_36%),repeating-radial-gradient(circle_at_25%_30%,rgba(92,91,54,0.2)_0_8px,transparent_8px_22px),repeating-radial-gradient(circle_at_70%_60%,rgba(56,57,33,0.16)_0_9px,transparent_9px_20px),linear-gradient(135deg,#181b0f_0%,#232816_22%,#343722_42%,#262b18_68%,#171a0f_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(0,0,0,0.5),transparent_44%),linear-gradient(180deg,rgba(255,245,230,0.06),transparent_28%,rgba(0,0,0,0.22)_100%)]" />
          <div className="relative min-h-[920px] overflow-hidden rounded-[2.2rem] border border-white/8 px-6 py-6 md:px-8 md:py-8">
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(250,244,236,0.92)] text-[#232316] shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                <span className="font-display text-3xl leading-none">N</span>
              </div>
              <div className="cream-float rounded-[1.8rem] px-3 py-3 text-[#232316] md:w-[360px]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-5 text-sm">
                    <span>Preview</span>
                    <span>Product</span>
                    <span>Flow</span>
                  </div>
                  <Link href="/login" className="sun-button rounded-[1rem] px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em]">
                    Open app
                  </Link>
                </div>
                <div className="mt-5 flex items-center justify-between rounded-[1.4rem] bg-[#ece3d6] px-4 py-4">
                  <div>
                    <p className="text-3xl leading-none text-[#232316]">Meet Self-Agent</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#6b665a]">
                      Chat, annotate, export notes
                    </p>
                  </div>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f3c970] text-center text-sm font-semibold uppercase tracking-[0.06em] text-[#232316]">
                    Quiet
                    <br />
                    mode
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-10 max-w-[580px]">
              <h1 className="max-w-[13ch] font-display text-[4.6rem] leading-[0.94] text-[#f8f2e9] md:text-[5rem]">
                The thinking workspace, re-tuned.
              </h1>
              <p className="mt-6 max-w-[28rem] text-[1.1rem] leading-8 text-[#ebe2d5]">
                Self-Agent 把聊天、划句提问和结构化笔记收进同一块更平静的数字纸面里。
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[0.7rem] uppercase tracking-[0.24em] text-[#efe7da] backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-[#f3c970]" />
                calmer interface preview
              </div>
            </div>

            <div className="relative z-10 mt-10 h-[640px] md:h-[720px]">
              <div className="tablet-shell float-delayed absolute right-[18%] top-[8%] h-[600px] w-[470px] -rotate-[12deg] rounded-[2.7rem] p-[22px] md:right-[17%]">
                <div className="tablet-screen relative h-full rounded-[2.2rem] p-6 text-[#2b2a1f]">
                  <div className="absolute inset-0 rounded-[2.2rem] bg-[radial-gradient(circle_at_58%_34%,rgba(255,255,255,0.34),transparent_22%),linear-gradient(115deg,rgba(255,255,255,0.12),transparent_35%,rgba(0,0,0,0.08)_78%)]" />
                  <div className="absolute inset-x-8 top-7 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.18em] text-[#7f786c]">
                    <span>Self-Agent</span>
                    <span>linked note</span>
                  </div>
                  <div className="absolute left-[48%] top-[16%] h-[52%] w-[18%] -rotate-[8deg] rounded-full border border-[rgba(94,82,62,0.22)]" />
                  <div className="absolute left-[57%] top-[22%] h-[34%] w-[3px] rotate-[12deg] bg-[rgba(108,97,77,0.18)]" />
                  <div className="absolute left-[54%] top-[30%] h-[11%] w-[17%] rotate-[35deg] rounded-full border border-[rgba(108,97,77,0.2)]" />
                  <div className="absolute left-[52%] top-[38%] h-[13%] w-[18%] -rotate-[26deg] rounded-full border border-[rgba(108,97,77,0.2)]" />
                  <div className="absolute left-[59%] top-[46%] h-[12%] w-[14%] rotate-[28deg] rounded-full border border-[rgba(108,97,77,0.2)]" />
                  <div className="absolute left-8 top-24 right-8 rounded-[1.6rem] border border-[rgba(64,53,39,0.08)] bg-[rgba(255,248,239,0.62)] px-5 py-5 shadow-[0_8px_28px_rgba(49,38,23,0.08)]">
                    <p className="text-sm uppercase tracking-[0.18em] text-[#8b8377]">Conversation synthesis</p>
                    <p className="mt-3 text-[1.02rem] leading-8">
                      帮我把这段关于产品定位的聊天整理成一页可以导出的结构化笔记。
                    </p>
                  </div>
                  <div className="absolute bottom-10 left-8 right-8 rounded-[1.75rem] bg-[rgba(67,70,38,0.9)] px-5 py-5 text-[#f6efe5] shadow-[0_18px_34px_rgba(22,22,14,0.18)]">
                    <p className="text-sm uppercase tracking-[0.18em] text-[#d8c9a8]">Annotation</p>
                    <p className="mt-3 text-[1.02rem] leading-8">
                      圈出一句话，继续追问，不必离开当前思路。
                    </p>
                  </div>
                </div>
              </div>

              <div className="cream-float absolute bottom-[10%] left-[0] w-[340px] rounded-[1.7rem] p-4">
                <div className="overflow-hidden rounded-[1.4rem] border border-[#f7b100] bg-[linear-gradient(180deg,#91a18b,#5d6a52)]">
                  <div className="relative h-[150px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(230,236,225,0.28),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />
                    <CirclePlay className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-[#ffb31a]" />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#4d483d]">
                  把每次对话变成可回看的研究片段和笔记剪影。
                </p>
              </div>

              <div className="cream-float absolute bottom-[18%] right-[1.5%] w-[360px] rounded-[1.7rem] p-5">
                <p className="text-4xl leading-none text-[#232316]">Daily digest</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#6b665a]">
                  Notes, decisions included
                </p>
                <p className="mt-5 text-sm leading-6 text-[#4d483d]">
                  自动汇总今天的追问、批注与导出笔记，让研究轨迹自然留存。
                </p>
              </div>

              <Link
                href="/login"
                className="sun-button absolute bottom-[6%] right-[3%] inline-flex h-16 items-center justify-center rounded-[1.3rem] px-10 text-sm font-semibold uppercase tracking-[0.12em]"
              >
                Start a session
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.06fr_0.94fr]">
          <div className="paper-panel rounded-[2.4rem] p-8">
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-muted-foreground">Core flow</p>
            <h2 className="mt-3 font-display text-5xl leading-[0.94]">A calm loop for reading, asking, and exporting.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["Read closely", "在回答和资料里选中一句话，保留上下文。"],
                ["Ask inline", "继续问这句话，不打断主线。"],
                ["Save clearly", "导出为带标签的长期笔记。"],
              ].map(([title, copy]) => (
                <div key={title} className="paper-card rounded-[1.8rem] p-5">
                  <p className="font-display text-3xl leading-none">{title}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="olive-panel rounded-[2.4rem] p-8">
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-primary-foreground/65">Why it feels different</p>
            <h2 className="mt-3 font-display text-5xl leading-[0.94] text-[#f7f1e8]">Less dashboard, more desk.</h2>
            <ul className="mt-8 space-y-4 text-base leading-8 text-[#f2e8dc]">
              <li>暖白纸面与深色实物背景形成更像器物的层次。</li>
              <li>按钮和卡片只有轻微悬浮，不做 SaaS 式夸张反馈。</li>
              <li>标题采用更像编辑排版的 serif 节奏，保留技术产品的清晰度。</li>
            </ul>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="paper-card rounded-[2.2rem] p-8">
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-muted-foreground">Conversation memory</p>
            <h2 className="mt-3 font-display text-5xl leading-[0.94]">Keep the thread.</h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">
              让每次问答、批注和笔记导出之间有清晰链路，而不是散在几个窗口里。
            </p>
          </div>
          <div className="paper-card rounded-[2.2rem] p-8">
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-muted-foreground">Launch preview</p>
            <h2 className="mt-3 font-display text-5xl leading-[0.94]">Enter the workspace.</h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">
              这套视觉语言已经同步到登录页、聊天主界面和笔记页，用更安静的方式承接日常使用。
            </p>
            <Link href="/login" className="story-link mt-6 inline-flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-foreground">
              Open login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
