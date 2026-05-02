---
name: fbs-writer
version: 2.1.2
scene-packs: [general]
description: "福帮手长文档工具 | 高质量书籍、手册、白皮书、行业指南、长篇报道全流程；S0–S6 写作工作流、S/P/C/B 分层审校、中文排版与 Markdown/HTML/DOCX/PDF 多格式导出。触发词：写书、出书、写长篇、写手册、写白皮书、写行业指南、定大纲、写章节、导出、去AI味、质量自检、整理素材、intent-menu"
user-invocable: true
metadata: {"openclaw":{"emoji":"📖","name":"fbs-writer","skillKey":"fbs-writer","requires":{"bins":["node"]}}}
---

# 福帮手长文档写作工具（FBS-Writer）

> **版本**：2.1.2
> **通道**：OpenClaw 全量适配版
> **适配器**：openclaw/fbs-writer/adapter/

---

## 快速开始

### 首次使用

```
意图选择 → intake-router → S0 初始化 → 开始写作
```

### 继续写作

```
检查 .fbs/session-resume.json → 恢复上次位置 → 继续写稿
```

---

## 核心命令

| 操作 | 命令 |
|------|------|
| 新建书稿 | `node scripts/init-fbs-multiagent-artifacts.mjs --book-root <path>` |
| 意图路由 | `node scripts/intake-router.mjs --book-root <path> --intent <intent>` |
| 质量自检 | `node scripts/quality-auditor-lite.mjs --book-root <path>` |
| 合并全稿 | `node scripts/merge-chapters.mjs --book-root <path>` |
| 会话退出 | `node scripts/session-exit.mjs --book-root <path> --json` |

---

## OpenClaw 适配层

本技能使用独立的 OpenClaw 适配层：

| 模块 | 路径 | 功能 |
|------|------|------|
| 上下文映射 | `openclaw/fbs-writer/adapter/context-mapper.mjs` | WorkBuddy ↔ OpenClaw 上下文转换 |
| 结果格式化 | `openclaw/fbs-writer/adapter/result-formatter.mjs` | 脚本输出格式适配 |
| 宿主桥接 | `scripts/lib/openclaw-host-bridge.mjs` | OpenClaw 宿主能力检测 |
| 技能配置 | `openclaw/fbs-writer/skill.json` | OpenClaw 标准技能配置 |

---

## 文件结构

```
fbs-writer/
├── openclaw/                    # OpenClaw 适配层
│   └── fbs-writer/
│       ├── skill.json          # 技能配置
│       └── adapter/            # 适配器
│           ├── context-mapper.mjs    # 上下文映射
│           └── result-formatter.mjs   # 结果格式化
├── scripts/                     # 核心脚本
│   ├── intake-router.mjs       # 意图路由
│   ├── quality-auditor-lite.mjs # 质量审计
│   └── lib/
│       ├── openclaw-host-bridge.mjs  # OpenClaw 宿主桥接
│       └── user-errors.mjs     # 错误处理
└── SKILL.md                    # 主入口文档
```

---

## 会话恢复

OpenClaw 环境下的会话恢复完全依赖文件系统：

1. `.fbs/session-resume.json` — 会话恢复卡
2. `.fbs/chapter-status.md` — 章节状态台账
3. `.fbs/smart-memory/` — 智能记忆目录

---

## 输出规范

### 中文输出（强制）

所有用户可见输出必须是纯中文：

| 场景 | 示例 |
|------|------|
| 章节开始 | 正在写第 X 章... |
| 章节完成 | 第 X 章完成（2000 字） |
| 进度更新 | 第 3/10 章完成 ████████░░░░░░░░░░░ 30% |
| 错误提示 | 找不到文件：chapters/xx.md |
| 阶段切换 | 进入第四阶段：质量检查 |

### 静默执行规则

短任务（<2分钟）静默执行，不显示进度条：

```bash
# 静默执行
node scripts/<script>.mjs ... > $null 2>&1

# 长任务显示进度
node scripts/export-to-pdf.mjs ...  # 显示进度条
```

---

## 意图路由

| 用户输入 | --intent 值 | 说明 |
|---------|------------|------|
| 写书、出书 | `book` | 通用书籍 |
| 写长篇 | `novel` | 小说/故事 |
| 写手册 | `manual` | 操作指南 |
| 写白皮书 | `whitepaper` | 行业报告 |
| 写行业指南 | `industry-guide` | 行业指导 |
| 写长篇报道 | `long-report` | 深度报道 |

---

## S0–S6 工作流

```
S0 素材整理 → S1/S2 大纲规划 → S3 正式写稿 → S3.5 扩写 → S4 质检 → S5/S6 交付归档
```

**S3 写稿规则**：
- 每轮最多修改 2 个文件
- 完成 1 章立即输出进度
- 进度条格式：`第 X/Y 章完成 ██████░░░░░░░░░░░░░ 30% 预计还需：X 分钟`

---

## 宿主能力

OpenClaw 宿主能力通过 `openclaw-host-bridge.mjs` 检测：

| 功能 | 状态 | 说明 |
|------|------|------|
| Node.js | ✅ | 核心运行时 |
| 文件系统 | ✅ | .fbs/ 目录 |
| Git | ⚡ | 可选，用于版本控制 |
| PDF 导出 | ⚡ | 需安装 puppeteer |
| DOCX 导出 | ⚡ | 需安装 html-to-docx |
