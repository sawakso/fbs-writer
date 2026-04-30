---
name: fbs-writer
description: "福帮手长文档工具 | 高质量书籍、手册、白皮书、行业指南、长篇报道全流程；S0–S6 写作工作流、S/P/C/B 分层审校、中文排版与 Markdown/HTML/DOCX/PDF 多格式导出。触发词：写书、出书、写长篇、写手册、写白皮书、写行业指南、定大纲、写章节、导出、去AI味、质量自检、整理素材"
user-invocable: true
metadata: {"openclaw":{"emoji":"📖","name":"fbs-writer","skillKey":"fbs-writer","requires":{"bins":["node"]}}}
---

# 福帮手长文档写作工具（FBS-Writer）

> **版本**：2.1.2
> **通道**：OpenClaw 全量适配版
> **说明**：本技能基于 fbs-bookwriter v2.1.2，OpenClaw 环境全量适配，脚本层 100% 复用 WorkBuddy 版本。

---

## ⚡ 执行速查卡（AI 必读）

### 第一步：开场入口（强制）

**每次用户触发时必须执行：**

```bash
node scripts/intake-router.mjs --book-root <bookRoot> --intent auto --json --enforce-required
```

- `--book-root` 需使用书稿根目录的**绝对路径**
- 脚本会自动检测宿主能力、降级到 `node-cli` 模式（在 OpenClaw 下属正常行为）
- OpenClaw 下建议将 JSON 结果写入 `.fbs/intake-router.last.json` 便于调试

### 第二步：恢复优先（按此顺序）

```
1. IF exists(.fbs/workbuddy-resume.json)  → 读取恢复卡 → 恢复会话
2. ELSE IF exists(.fbs/chapter-status.md) → 读取章节台账 → 补写恢复卡后恢复
3. ELSE                                     → 进入 S0 初始化
```

**注意**：OpenClaw 下不提供 WorkBuddy 宿主记忆 API，完全依赖 `.fbs/` 文件系统保存状态。

### 第三步：S0 初始化（无项目时）

```bash
node scripts/init-fbs-multiagent-artifacts.mjs --book-root <bookRoot>
```

创建虚拟书房目录结构：
- `.fbs/workbuddy-resume.json` — 会话恢复卡
- `.fbs/chapter-status.md` — 章节状态台账
- `.fbs/smart-memory/session-resume-brief.md` — 会话摘要
- `chapters/` — 书稿章节目录
- `deliverables/` — 交付物目录

---

## 意图 → 脚本 速查表（MVP 精简版）

| 用户说了什么 | 立即执行 |
|------------|---------|
| 首次进入 / 新建项目 | `node scripts/init-fbs-multiagent-artifacts.mjs --book-root <bookRoot>` |
| 继续写 / 接着写 | 读 `.fbs/workbuddy-resume.json` → 从上次位置继续 |
| 质量自检 / 去 AI 味 | `node scripts/quality-auditor-lite.mjs --book-root <bookRoot>` |
| 退出 / 停止 | `node scripts/session-exit.mjs --book-root <bookRoot> --json` |
| 环境预检 | `node scripts/env-preflight.mjs --json` |
| S0 素材达标检测 | `node scripts/s0-exit-gate.mjs --book-root <bookRoot> --json` |
| 合并全稿 | `node scripts/merge-chapters.mjs --book-root <bookRoot>` |

---

## S0–S6 工作流概述

### S0：素材整理

收集主题、目标读者、核心主张、术语表、案例素材。

**达标条件**：`author-meta.md` 已填写 + 素材数 ≥ 赛道数 × 2。

### S1 / S2：大纲规划

确认目标读者画像 → 制定章节目录 → 案例库建立。

**达标条件**：大纲已确认 + `story-bank.md` ≥ 3 条案例。

### S3：正式写稿（串行约束）

每轮最多修改 **2 个文件**，完成 1 个再推进下 1 个。

**禁止**：
- 同一章节并行写多段
- 跳过 `s3-start-gate` 门禁
- 无备份大段删改

### S3.5：扩写（可选）

必须有书面 `.fbs/expansion-plan.md` 且用户确认后执行。

```bash
node scripts/expansion-word-verify.mjs --book-root <bookRoot>
```

### S4：质检

使用 `quality-auditor-lite.mjs` 执行 S/P/C/B 四层质检：

| 层 | 定位 | 规则数 |
|----|------|-------|
| S | 句级 | 6 |
| P | 段级 | 4 |
| C | 章级 | 5 |
| B | 篇级 | 6 |

**通过条件**：综合分 ≥ 7.5 **且** G（门禁）全绿。

### S5 / S6：交付与归档

通过 `final-manuscript-clean-gate.mjs` 检查终稿不含过程标注（如 `待核实-MAT`），再执行交付。

---

## 会话恢复机制（OpenClaw 专用）

OpenClaw 无宿主记忆 API，完全依赖文件系统。

### 恢复卡结构 `.fbs/workbuddy-resume.json`

```json
{
  "$schema": "fbs-session-resume-v1",
  "lastAction": "S3 写作：第3章",
  "nextRecommendations": ["继续写第4章", "检查第3章质量"],
  "modifiedFiles": ["chapters/03-xxx.md"],
  "wordCount": 12000,
  "chapterCount": 3,
  "completedCount": 2
}
```

### 退出时必须执行

```bash
node scripts/session-exit.mjs --book-root <bookRoot> --json
```

脚本将写入：
- `.fbs/workbuddy-resume.json`
- `.fbs/smart-memory/session-resume-brief.md`

---

## 工具调用规范

### 执行脚本（使用 `exec`）

```bash
node scripts/<script-name>.mjs --book-root <bookRoot> [--options]
```

### 读取文件（使用 `read`）

```bash
read .fbs/workbuddy-resume.json
read .fbs/chapter-status.md
read chapters/03-xxx.md
```

### 写入文件（使用 `write`）

```bash
write chapters/03-xxx.md
write .fbs/workbuddy-resume.json
```

### 搜索（使用 `web_search`）

联网查证时优先使用 `web_search`，并将结果沉淀到 `.fbs/search-ledger.jsonl`。

---

## OpenClaw 环境说明

### 宿主能力桥接

本技能使用 `scripts/lib/openclaw-host-bridge.mjs` 提供 OpenClaw 适配层，自动检测宿主环境并提供：

| 功能 | 支持情况 | 说明 |
|------|---------|------|
| S0–S6 全流程 | ✅ | 核心写作流程完整可用 |
| 会话恢复 | ✅ | 基于 `.fbs/` 文件，完全兼容 |
| 质量自检 | ✅ | S/P/C/B 四层质检 |
| Markdown 导出 | ✅ | 原生支持 |
| HTML 导出 | ✅ | 原生支持 |
| DOCX 导出 | ⚡ | 需安装 `html-to-docx` 或 `docx` |
| PDF 导出 | ⚡ | 需安装 `puppeteer` |
| 用户画像 | ⚡ | 需在 `~/.openclaw/fbs-user-profile/` 创建配置文件 |

### 检测宿主类型

```bash
node scripts/lib/openclaw-host-bridge.mjs --detect
node scripts/lib/openclaw-host-bridge.mjs --snapshot
node scripts/lib/openclaw-host-bridge.mjs --export-caps
```

### 导出能力

**支持格式：**

| 格式 | 命令 | 依赖 |
|------|------|------|
| Markdown | 直接使用 | 无 |
| HTML | `renderMarkdownPreview()` | `markdown-it` |
| DOCX | `node scripts/export-to-docx.mjs <input.md> [output.docx]` | `html-to-docx` 或 `docx` |
| PDF | `node scripts/export-to-pdf.mjs <input.md> [output.pdf]` | `puppeteer` |

**安装可选依赖：**
```bash
npm install html-to-docx docx puppeteer
```

**自动交付与下载链接（重要）：**

导出文件后，**必须**执行交付脚本，自动复制文件到网站可访问目录并输出下载链接：

```bash
# 导出后执行交付脚本
node scripts/deliver-export.mjs <导出文件路径>
```

交付脚本会自动：
1. 将文件复制到 `/www/wwwroot/downloads/` 目录
2. 输出 Markdown 格式的下载链接表格

**交付输出示例：**
```
## 📥 第一章已生成

| 格式 | 文件名 | 下载 |
|------|--------|------|
| 📘 Word (DOCX) | 01-先认识南极.docx | [点击下载](http://175.178.72.8/downloads/01-先认识南极.docx) |

**直接下载：** http://175.178.72.8/downloads/01-先认识南极.docx
```

**注意**：如果服务器没有 `/www/wwwroot/downloads/` 目录权限，脚本会输出警告但仍显示源文件路径，用户可通过服务器文件管理器手动复制。

### Linux 服务器注意事项

在 Linux 服务器环境下执行脚本时：

1. **Node.js 环境**：确保已安装 Node.js 18+
2. **工作目录**：使用绝对路径指定 `--book-root`
3. **依赖安装**：如需导出功能，执行：
   ```bash
   npm install html-to-docx docx puppeteer
   ```
4. **权限**：确保脚本有执行权限
   ```bash
   chmod +x scripts/*.mjs
   ```

### 宿主检测命令

```bash
node scripts/lib/openclaw-host-bridge.mjs --detect
node scripts/lib/openclaw-host-bridge.mjs --snapshot
node scripts/lib/openclaw-host-bridge.mjs --export-caps
```

---

## 触发词（完整版）

**主触发**：写书、出书

**写作类**：写长篇、写手册、写白皮书、写行业指南、写报道、写专题、写调查报道、写长文

**流程类**：定大纲、写章节、整理素材

**质量类**：去AI味、质量自检

**导出类**：导出

---

## 详细规范指针

| 场景 | 文档 |
|------|------|
| 完整行为规范 | `references/01-core/skill-full-spec.md` |
| 工作流总入口 | `references/01-core/section-3-workflow.md` |
| S3 写作规范 | `references/01-core/workflow-volumes/workflow-s3-writing-guide.md` |
| 扩写规范 | `references/01-core/s3-expansion-phase.md` |
| 质量评分权威 | `references/02-quality/quality-check.md` |
| 场景包激活 | `references/01-core/scene-pack-activation-guide.md` |
| 文档总索引 | `references/01-core/skill-index.md` |

---
