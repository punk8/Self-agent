# Self-Agent

个人笔记 Agent —— 一个具备 AI 聊天能力的智能笔记应用。

提供类似 ChatGPT/Claude 的对话体验，同时引入**划句提问**和**自动笔记管理**两大核心功能，让 AI 对话真正服务于知识沉淀。

## 核心功能

### 💬 AI 聊天

- 流式对话，支持多种 LLM（OpenAI、Claude、Ollama 本地模型）
- 会话管理（创建、切换、搜索、删除）
- Markdown 渲染（代码高亮、LaTeX 公式、Mermaid 图表）
- 模型自由切换，云端与本地模型无缝衔接

### ✏️ 划句提问 (Inline Q&A)

- 在 AI 回复中**划词选择**，直接对选中内容提问
- 回答以**内联标注**的形式显示在原文位置（类似笔记批注）
- 被标注的文字带有下划线，点击可**展开/收起**对应回复
- 比传统聊天窗口更直观，知识关联更紧密

### 📒 自动笔记 + Tag 检索

- 对话自动导出为结构化笔记，AI 生成摘要
- 自动/手动打 Tag，支持多维度分类
- Tag 反向检索：按 Tag 查找笔记及对应的原始聊天记录
- 笔记可编辑、可导出

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 14+ (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 数据库 | SQLite (开发) / PostgreSQL (生产) |
| ORM | Prisma |
| 认证 | NextAuth.js |
| LLM 集成 | OpenAI / Anthropic / Ollama |
| 部署 | Docker Compose |

## 多端适配

采用**响应式 Web + PWA** 方案，一套代码适配桌面端和移动端：

- **桌面端**：侧边栏常驻，宽屏布局，鼠标划词提问
- **移动端**：抽屉式侧边栏，全屏聊天，底部导航栏，长按划词提问
- **PWA**：支持添加到主屏幕、离线缓存

## 项目结构

```
self-agent/
├── src/
│   ├── app/                    # Next.js 页面和 API 路由
│   │   ├── (auth)/             # 认证页面
│   │   ├── (chat)/             # 聊天页面
│   │   ├── api/                # API 路由
│   │   ├── notes/              # 笔记页面
│   │   └── settings/           # 设置页面
│   ├── components/             # React 组件
│   │   ├── chat/               # 聊天相关组件
│   │   ├── notes/              # 笔记相关组件
│   │   ├── sidebar/            # 侧边栏组件
│   │   ├── layout/             # 响应式布局组件
│   │   └── shared/             # 共享组件
│   ├── lib/
│   │   ├── llm/                # LLM 集成层（多 Provider 抽象）
│   │   └── ...                 # 工具函数
│   ├── stores/                 # Zustand 状态管理
│   └── types/                  # 类型定义
├── prisma/                     # 数据库 Schema 和迁移
├── public/                     # 静态资源
├── docker-compose.yml          # Docker 部署配置
└── package.json
```

## 系统架构

```
用户浏览器 (响应式 Web + PWA)
    │
┌───┴──────────────────────────────────┐
│  前端 UI (Next.js App Router)        │
│  聊天界面 / 划句提问 / 笔记浏览      │
└───┬──────────────────────────────────┘
    │
┌───┴──────────────────────────────────┐
│  后端 API (Next.js API Routes)       │
│  认证 / 会话CRUD / SSE流式响应       │
│  笔记导出 / Tag管理 / 标注API        │
└───┬──────────────────────────────────┘
    │
┌───┴──────────────────────────────────┐
│  LLM 集成层                          │
│  统一 Provider 抽象                  │
│  上下文管理 / Token计算 / 自动Tag    │
└───┬──────────────────────────────────┘
    │
┌───┴──────────────────────────────────┐
│  数据层                              │
│  SQLite/PostgreSQL (Prisma)          │
│  用户 / 会话 / 消息 / 标注 / 笔记    │
└──────────────────────────────────────┘
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 开发环境

```bash
# 克隆项目
git clone https://github.com/punk8/Self-agent.git
cd Self-agent

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 API Key

# 初始化数据库
npx prisma migrate dev

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### Docker 部署

```bash
docker compose up -d
```

## 环境变量

```env
# LLM API Keys (至少配置一个)
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Ollama (本地模型，可选)
OLLAMA_BASE_URL=http://localhost:11434

# 数据库
DATABASE_URL=file:./data/self-agent.db

# 认证
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## 开发路线图

- [x] 项目架构设计
- [x] Phase 1: 基础骨架（Next.js + Prisma + 响应式 UI）
- [x] Phase 2: LLM 集成 + SSE 流式对话 + Markdown 渲染
- [x] Phase 3: 会话管理（CRUD + 侧边栏 + 自动标题）
- [x] Phase 4: 划句提问（SelectableText + FloatingToolbar + InlineAnnotation）
- [x] Phase 5: 笔记 + Tag 系统（自动导出 + LLM 生成摘要/Tag）
- [x] Phase 6: 多模型支持（OpenAI + Anthropic + Ollama）+ Docker 部署
- [ ] 用户认证（NextAuth.js）
- [ ] PWA 支持（离线缓存 + 添加到主屏）

## License

MIT
