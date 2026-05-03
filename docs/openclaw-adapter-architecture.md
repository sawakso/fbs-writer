# OpenClaw 适配架构映射文档

> 任务编号：2701 | Phase 1.1 交付物
> 作者：庞炳戌 | 日期：2026-04-28

---

## 1. fbs-bookwriter 现有架构梳理

### 1.1 整体定位

fbs-bookwriter 是一个 **WorkBuddy 插件（Plugin）**，通过注册斜杠命令（slash commands）的方式嵌入 WorkBuddy 对话流，让 AI 按预定工作流协同完成书稿创作。

### 1.2 目录结构与职责

```
fbs-bookwriter/
├── .codebuddy-plugin/
│   └── plugin.json          # 插件元数据（命令注册表）
├── commands/                # 核心：命令定义（Markdown 格式的 AI 指令书）
│   ├── write-book.md        # 主命令 → 六阶段完整工作流
│   ├── book-outline.md      # 阶段2：目录设计 + 视觉规划
│   ├── book-chapter.md      # 阶段3：单章写作（四流三审）
│   ├── book-build.md        # 阶段4：排版构建
│   ├── book-review.md       # 阶段5：质量终审
│   ├── book-style.md        # 风格档案管理
│   ├── book-competitor.md   # 竞品扫描
│   └── book-check.md        # 质量检查
├── references/              # AI 上下文注入文档（规则库）
│   ├── presets.md           # 风格预设
│   ├── strategy.md          # 策略矩阵（体量×深度）
│   ├── templates.md         # 内容模板
│   ├── quality-S.md         # S层：句级质量规则
│   ├── quality-PLC.md       # P/C/B层：段/章/书级质量规则
│   ├── quality-check.md     # 质量检查与报告
│   ├── visual.md            # 视觉资产规范
│   ├── typography.md        # 排版规范
│   └── build.md             # 构建系统说明
├── assets/                  # 构建资源
│   ├── books.config.js      # 书籍配置模板
│   ├── build.mjs            # Node.js 构建脚本（生成 HTML/PDF/DOCX）
│   └── style.css            # 排版样式
└── README.md
```

### 1.3 核心调用链

```
用户输入 "/write-book --topic=..." 
    ↓
WorkBuddy 匹配命令 → 加载 commands/write-book.md
    ↓
AI 读取命令文件 → 理解工作流规则 → 开始六阶段流程
    ↓
各阶段按需读取 references/ 文件注入上下文
    ↓
阶段3写作：四流并行（Researcher × 2 + Writer + Illustrator）+ 三审并行（Critic-S / L1 / L2 / L3）
    ↓
阶段4构建：生成 MD → 用户本地执行 node build.mjs → HTML + PDF + DOCX
    ↓
产出物编号 [S1]~[S6] 逐阶段输出
```

### 1.4 关键机制解析

| 机制 | 工作原理 | 适配要点 |
|------|---------|---------|
| **命令注册** | `.codebuddy-plugin/plugin.json` 声明命令名称与入口文件 | OpenClaw 需改为 `skill.json` 配置 |
| **触发方式** | 用户键入 `/write-book` 或触发词（"福帮手"、"写书"等） | 保留触发词，适配触发机制 |
| **上下文注入** | AI 读取 Markdown 文件获得规则知识，无代码执行 | OpenClaw 需确认 Markdown 文件注入方式 |
| **多角色并行** | AI 内部模拟 Researcher/Writer/Illustrator/Critic 多角色 | 纯 AI 指令级别，无平台依赖，可直接复用 |
| **状态管理** | 会话内维护阶段状态，通过 `strategy.md §5` 产出物编号追踪 | 会话内状态无需适配，跨会话恢复需 .fbs 文件 |
| **构建输出** | `build.mjs` 运行在用户本地 Node.js | 构建模块可直接复用，与平台无关 |

---

## 2. WorkBuddy Skill vs OpenClaw Skill 架构差异

### 2.1 平台定位对比

| 维度 | WorkBuddy | OpenClaw |
|------|-----------|---------|
| **平台类型** | AI 工作台 + 本地Agent | AI Skill 生态市场 |
| **技能载体** | Plugin（插件）| Skill（技能包） |
| **配置文件** | `.codebuddy-plugin/plugin.json` | `skill.json` |
| **入口机制** | 斜杠命令（/command）| Skill 触发器（trigger words + 命令行） |
| **上下文传递** | 直接读取本地文件 | 通过 Skill SDK 上下文 API |
| **多轮对话** | 原生支持 | 需通过 ClawSkill 类管理 session |
| **文件系统** | 全局可读写 | 沙箱隔离，需通过 SDK API |
| **构建工具** | 用户本地 Node.js | 可内嵌到 Skill 包或调用宿主环境 |

### 2.2 架构差异的核心影响

```
WorkBuddy                          OpenClaw
─────────────────────────────────────────────────────
/write-book (slash command)   →   skill trigger word
                                  + ClawSkill.run()

plugin.json (命令注册)         →   skill.json (技能清单)

AI 直读本地 .md 文件           →   通过 loadReference() API 注入
(零代码)                           (需要包装层)

会话内状态自然维持              →   ClawSkill.session 管理状态

用户本地 node build.mjs         →   内嵌构建或导出 MD

.codebuddy-plugin/ 目录        →   openclaw/ 适配层
```

---

## 3. WorkBuddy → OpenClaw 架构映射图

```
┌──────────────────────────────────────────────────────────────┐
│                     fbs-bookwriter 全架构                     │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────────┐   │
│  │   WorkBuddy 层        │    │     OpenClaw 层（新增）    │   │
│  │  .codebuddy-plugin/  │    │     openclaw/            │   │
│  │  plugin.json         │    │     skill.json           │   │
│  │  commands/*.md       │    │     index.ts             │   │
│  │                      │    │     adapter/             │   │
│  │  触发：/write-book    │    │     触发：触发词/CLI       │   │
│  └──────────┬───────────┘    └──────────┬───────────────┘   │
│             │                            │                   │
│             └──────────┬─────────────────┘                   │
│                        ▼                                     │
│              ┌──────────────────┐                           │
│              │   shared/ 共享核心 │                           │
│              │                  │                           │
│              │  references/     │ ← 规则库（S/P/C/B层等）     │
│              │  scripts/        │ ← 核心工作流脚本            │
│              │  assets/         │ ← 构建工具（build.mjs）     │
│              └──────────────────┘                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. 可复用 vs 需适配的模块清单

### 4.1 可直接复用（零修改）

| 模块 | 路径 | 说明 |
|------|------|------|
| 质量规则 | `references/quality-S.md` | 纯内容文档，AI 上下文注入，平台无关 |
| 质量规则 | `references/quality-PLC.md` | 同上 |
| 风格预设 | `references/presets.md` | 同上 |
| 策略矩阵 | `references/strategy.md` | 同上 |
| 内容模板 | `references/templates.md` | 同上 |
| 视觉规范 | `references/visual.md` | 同上 |
| 排版规范 | `references/typography.md` | 同上 |
| 构建规范 | `references/build.md` | 同上 |
| 构建脚本 | `assets/build.mjs` | Node.js 脚本，平台无关 |
| 样式文件 | `assets/style.css` | 纯 CSS，平台无关 |
| 书籍配置 | `assets/books.config.js` | 纯配置模板，平台无关 |

### 4.2 需适配（新增包装层）

| 模块 | 原形式 | 适配目标 | 适配工作量 |
|------|--------|---------|-----------|
| 命令注册 | `plugin.json` + 斜杠命令 | `skill.json` + ClawSkill 触发器 | 低（配置转换） |
| 入口文件 | 无（直接由 AI 读取 .md） | `openclaw/index.ts` | 中（封装调用链） |
| 上下文注入 | AI 自动读取本地文件 | `adapter/context-mapper.ts` | 中（API 包装） |
| 会话状态 | 原生对话维持 | ClawSkill.session 对象 | 中（状态映射） |
| 结果格式化 | Markdown 直接输出 | `adapter/result-formatter.ts` | 低（格式化包装） |
| .fbs 恢复文件 | 无标准化处理 | 标准化读写 API | 低（文件 I/O 封装） |

---

## 5. .fbs 文件机制说明

### 5.1 什么是 .fbs 文件？

`.fbs` 是 fbs-bookwriter 的**项目状态持久化目录**，在用户的书稿工作目录中生成。

```
[书名]/
  ├── .fbs/
  │   ├── workbuddy-resume.json   # 会话恢复卡（跨会话续写的核心）
  │   ├── style-profile.json      # 风格档案
  │   ├── outline.json            # 目录结构
  │   └── progress.json          # 写作进度追踪
  ├── config/
  ├── src/
  └── ...
```

### 5.2 workbuddy-resume.json 结构

```json
{
  "version": "4.0",
  "book_title": "书名",
  "current_stage": "S3",
  "current_chapter": 5,
  "total_chapters": 12,
  "style_preset": "practical",
  "size": "standard",
  "depth": "standard",
  "completed_chapters": [1, 2, 3, 4],
  "style_profile": { ... },
  "outline": [ ... ],
  "last_session": "2026-04-28T22:00:00+08:00",
  "run_logs": [ ... ]
}
```

### 5.3 .fbs 文件在 OpenClaw 适配中的作用

| 场景 | 行为 |
|------|------|
| 首次启动 | 用户说"帮我写书" → 创建 .fbs/workbuddy-resume.json |
| 会话结束 | 用户说"退出" → 更新 .fbs/workbuddy-resume.json，写入当前进度 |
| 会话恢复 | 用户说"继续" → 读取 .fbs/workbuddy-resume.json → 从中断处恢复 |
| OpenClaw 适配 | `adapter/context-mapper.ts` 负责 .fbs 文件的标准化读写 |

---

## 6. 阶段1.1 结论

1. **核心工作流逻辑全部在 `references/` 和 `commands/` 的 Markdown 文件中**，无平台耦合，可完全复用到 `shared/` 目录。
2. **唯一需要新增的是 `openclaw/` 适配层**，包含：`skill.json`（配置）、`index.ts`（入口）、`adapter/context-mapper.ts`（上下文映射）、`adapter/result-formatter.ts`（格式化）。
3. **构建工具 `build.mjs` 零改造**，直接在 `shared/` 复用。
4. **`.fbs` 文件机制是跨会话恢复的关键**，需在适配层标准化实现文件读写。

---

*文档版本：v1.0 | 2026-04-28 | 任务编号 2701*
