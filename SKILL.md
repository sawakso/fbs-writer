---
name: fbs-writer
version: 2.1.2
scene-packs: [general]
description: "福帮手长文档工具 | 高质量书籍、手册、白皮书、行业指南、长篇报道全流程；S0–S6 写作工作流、S/P/C/B 分层审校、中文排版与 Markdown/HTML/DOCX/PDF 多格式导出。触发词：写书、出书、写长篇、写手册、写白皮书、写行业指南、定大纲、写章节、导出、去AI味、质量自检、整理素材"
user-invocable: true
metadata: {"openclaw":{"emoji":"📖","name":"fbs-writer","skillKey":"fbs-writer","requires":{"bins":["node"]}}}
---

# 福帮手长文档写作工具（FBS-Writer）

> **版本**：2.1.2
> **通道**：OpenClaw 全量适配版
> **说明**：本技能基于 fbs-bookwriter v2.1.2 移植，OpenClaw 环境全量适配。WorkBuddy 依赖已做动态降级，非 WorkBuddy 宿主下静默跳过不报错。

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
1. IF exists(.fbs/session-resume.json)  → 读取恢复卡 → 恢复会话
2. ELSE IF exists(.fbs/chapter-status.md) → 读取章节台账 → 补写恢复卡后恢复
3. ELSE                                     → 进入 S0 初始化
```

**注意**：OpenClaw 下不提供 WorkBuddy 宿主记忆 API，完全依赖 `.fbs/` 文件系统保存状态。

### 第三步：S0 初始化（无项目时）

```bash
node scripts/init-fbs-multiagent-artifacts.mjs --book-root <bookRoot>
```

创建虚拟书房目录结构：
- `.fbs/session-resume.json` — 会话恢复卡
- `.fbs/chapter-status.md` — 章节状态台账
- `.fbs/smart-memory/session-resume-brief.md` — 会话摘要
- `chapters/` — 书稿章节目录
- `deliverables/` — 交付物目录

---

## 意图 → 脚本 速查表（MVP 精简版）

| 用户说了什么 | 立即执行 |
|------------|---------|
| 首次进入 / 新建项目 | `node scripts/init-fbs-multiagent-artifacts.mjs --book-root <bookRoot>` |
| 继续写 / 接着写 | 读 `.fbs/session-resume.json` → 从上次位置继续 |
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

## 会话恢复机制

OpenClaw 下无宿主记忆 API，会话恢复完全依赖文件系统。

### 恢复卡结构 `.fbs/session-resume.json`

> 文件名沿用 WorkBuddy 时代的 `session-resume.json`，但内容已适配 OpenClaw，

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
- `.fbs/session-resume.json`
- `.fbs/smart-memory/session-resume-brief.md`

---

## 工具调用规范

### 执行脚本（使用 `exec`）

```bash
node scripts/<script-name>.mjs --book-root <bookRoot> [--options]
```

### 读取文件（使用 `read`）

```bash
read .fbs/session-resume.json
read .fbs/chapter-status.md
read chapters/03-xxx.md
```

### 写入文件（使用 `write`）

```bash
write chapters/03-xxx.md
write .fbs/session-resume.json
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
| 📘 Word (DOCX) | 01-先认识南极.docx | [点击下载](https://lrz.u3w.com/downloads/01-先认识南极.docx) |

**直接下载：** https://lrz.u3w.com/downloads/01-先认识南极.docx
```

**注意**：
- 如果服务器没有下载目录权限，脚本会输出警告但仍显示源文件路径。
- Nginx 已配置 `.html` 和 `.pdf` 文件强制下载（Content-Disposition: attachment），点击链接直接弹出下载对话框，不会在浏览器中预览。

## 🔧 新服务器部署

> 这是给**任何 Linux 服务器**的通用部署指南，不依赖特定面板或目录结构。

### 前置要求

- Node.js 18+
- npm
- （可选）Nginx / Apache / Caddy 用于对外提供下载

### 安装步骤

#### 1. 安装 Node 依赖

```bash
cd 技能目录

# 核心功能（无需额外依赖）
npm install markdown-it

# 导出功能（按需安装）
npm install html-to-docx        # DOCX 导出
npm install puppeteer            # PDF 导出
```

> PDF 导出需要安装 Chromium（约 300MB），首次运行会自动下载：
> ```bash
> npx puppeteer browsers install chrome
> ```

#### 2. 运行环境设置向导

```bash
node scripts/setup-env.mjs
```

向导会询问以下信息（全部可留空跳过）：

| 信息 | 说明 | 示例 |
|------|------|------|
| 域名 | 你的网站域名 | `example.com` |
| 协议 | `http` 或 `https` | `https` |
| 下载目录路径 | 文件实际存放在服务器哪里 | `/var/www/downloads` |
| 网站根目录 | Web 服务器的文档根目录（可选） | `/var/www/html` |
| Nginx 配置目录 | 用于自动写入下载头配置（可选） | `/etc/nginx/conf.d` |

**你只需要提供服务可用的下载目录**，其他都可选。不配置域名也能用，交付时手动指定 URL 即可。

#### 3. 配置 Web 服务器（可选，用于提供下载）

如果填写了 Nginx 配置目录，向导会自动写入。否则需要手动将以下内容加入 Nginx 配置：

```nginx
# 将下载文件强制以附件形式下载，而非浏览器预览
location ~ ^/downloads/(.+)\.(html|pdf)$ {
    add_header Content-Disposition 'attachment; filename="$1.$2"';
}
```

配置后重载：
```bash
nginx -t && nginx -s reload
```

> Apache、Caddy 等其他 Web 服务器同理，核心就是让 `/downloads/*.html` 和 `/downloads/*.pdf` 带上 `Content-Disposition: attachment` 头。

### 环境配置 `.fbs-env.json`

由 `setup-env.mjs` 生成，位于技能根目录：

```json
{
  "$schema": "fbs-env-v1",
  "domain": "example.com",
  "scheme": "https",
  "downloadBaseUrl": "https://example.com/downloads",
  "downloadServerPath": "/var/www/downloads",
  "webRoot": "/var/www/html",
  "nginxExtDir": "/etc/nginx/conf.d"
}
```

**所有字段都可选。** 只设置 `downloadServerPath` 也能工作，文件会存到本地，交付时输出路径。

优先级：**环境变量 > `.fbs-env.json` > 代码内置默认值**

### 常用命令速查

```bash
# 查看当前配置
node scripts/setup-env.mjs --status

# 仅生成 Nginx 配置片段
node scripts/setup-env.mjs --nginx

# 重新配置
node scripts/setup-env.mjs

# 交付文件（自动读配置）
node scripts/deliver-export.mjs <文件路径>

# 交付文件（临时指定 URL）
node scripts/deliver-export.mjs <文件路径> http://你的域名/downloads
```

### Linux 服务器注意事项

1. **Node.js**：确保已安装 Node.js 18+
2. **工作目录**：使用绝对路径指定 `--book-root`
3. **权限**：确保脚本有执行权限
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

## ⚠️ 错误处理规范（AI 必读）

所有脚本入口已用 `lib/user-errors.mjs` 包装，执行失败时会输出统一格式的错误信息。

### 错误信息格式

当脚本执行失败时，错误信息采用以下格式输出：

```
⚠️ 调用<功能名>失败，<错误类型>：<具体原因>
  💡 建议：<解决方案>
```

实际输出示例：

```
📦 调用导出 PDF 失败，缺少依赖：Cannot find module 'puppeteer'
  💡 请进入 skill 目录执行：npm install puppeteer

🌐 调用入口路由失败，网络连接错误：request to https://pack.fbs.u3w.com/ failed
  💡 请检查网络连接或代理设置

📁 调用初始化项目失败，文件或目录不存在：ENOENT: /root/books/my-book
  💡 请检查路径是否存在：/root/books/my-book
```

### AI 行为规范

当 `exec` 调用的脚本执行失败时，必须遵循以下规则：

1. **不要直接显示原始报错堆栈**
   - ❌ 直接输出 `Error: ENOENT, open '/root/books/my-book/.fbs/resume.json'`
   - ✅ 提取关键信息，用上述中文格式呈现

2. **优先展示脚本输出的错误信息**
   - 脚本已内置 `user-errors.mjs` 包装，会输出格式化的中文 JSON 错误
   - 如果 `exec` 返回的 `stderr` 包含 `{"ok":false,"error":"..."}` → **直接展示 `error` 字段内容**
   - 如果没有 JSON 格式错误，则提取关键信息按模板包装

3. **给出可执行的建议**
   - 缺少依赖 → 告诉用户 `npm install` 什么包
   - 文件不存在 → 提示检查路径
   - 网络错误 → 提示检查网络

4. **不要报令人困惑的技术术语**
   - ❌ "Module not found"、"ECONNREFUSED"
   - ✅ "缺少依赖"、"连接被拒绝"

### 常见错误对照表

| 脚本 | 操作名 | 常见错误 & 建议 |
|------|--------|----------------|
| `intake-router.mjs` | 入口路由 | 网络错误 → 检查网络；路径错误 → 检查 `--book-root` |
| `init-fbs-*.mjs` | 初始化项目 | 目录已存在 → 加 `--force`；权限不足 → 检查目录权限 |
| `quality-auditor-lite.mjs` | 质量审计 | 未找到 chapter-status → 确认已初始化 |
| `session-exit.mjs` | 退出保存 | 无 `.fbs/` → 项目未初始化 |
| `export-to-pdf.mjs` | 导出 PDF | 缺少 puppeteer → 执行 `npm install puppeteer` |
| `export-to-docx.mjs` | 导出 DOCX | 缺少 html-to-docx → 执行 `npm install html-to-docx` |
| `merge-chapters.mjs` | 合并章节 | 无 chapters/ 目录 → 确认已写作至少一章 |
| `s0-exit-gate.mjs` | S0 门禁 | 素材不足 → 需补充更多素材 |

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
