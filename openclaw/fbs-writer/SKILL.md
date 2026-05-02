---
name: fbs-bookwriter-lrz
version: 2.1.2
plugin-id: fbs-bookwriter-lrz-v212
description: "福帮手出品 | 高质量长文档手稿工具链：书籍、手册，白皮书、行业指南、长篇报道、深度专题；支持联网查证（宿主允许时启用，离线自动降级）、S/P/C/B 分层审校、中文排版与 MD/HTML 交付。触发词：福帮手、福帮手写书skill、福帮手写书、写书、出书、写长篇、写手册、写白皮书、写行业指南、协作写书、定大纲、写章节、封面、插图、排版构建、导出、去AI味、质量自检、图文书、写报道、写深度稿、写特稿、写专题、写调查报道、写长文、拆书改写、海外本地化改写、爆款结构改写、激活原料、原料盘点、整理素材"
scene-packs: [general, genealogy, consultant, ghostwriter, training, personal-book, whitepaper, report]
user-invocable: true
ui-actions: true
metadata: {"openclaw":{"emoji":"📖","name":"fbs-bookwriter-lrz","skillKey":"fbs-bookwriter-lrz","requires":{"bins":["node"]}}}
---

# 福帮手长文档写作工具（FBS-BookWriter-LRZ）

> **版本**：2.1.2
> **定位**：高质量长文档**手稿**工具链
> **核心价值**：专业级手稿（非终稿）、人在循环引领/把关/担责
> **通道**：OpenClaw 全量适配版

---

## ⚡ 执行速查卡（AI 必读）

### 🔒 输出抑制强制规则（最高优先级）

**所有 exec 调用脚本时，必须在命令结尾加 `> $null 2>&1`，禁止原始 stdout/stderr 进入对话流。**

### ⚠️ 输出规范（最高优先级）

#### 🌐 强制中文输出（铁律，无豁免）

**所有面向用户的输出必须是纯中文，禁止出现任何英文。**

| ❌ 禁止 | ✅ 正确 |
|--------|--------|
| "Generating chapter 3..." | "正在生成第 3 章..." |
| "Error: ENOENT" | "错误：文件不存在" |
| "S3 Writing Phase" | "第三阶段：正式写稿" |
| "Progress: 50%" | "进度：50%" |

#### 用户可见文本规范

**绝对禁止在用户可见回复中出现：**
- AI 内部前缀：如"这是帮你整理的："、"帮你找到了："
- 过程说明：如"我来帮你"、"让我先..."
- 脚本原始输出：JSON 片段、命令行回显

**核心原则**：只输出用户最终需要知道的结论或内容。

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
| 上下文映射 | `openclaw/fbs-bookwriter-lrz/adapter/context-mapper.mjs` | WorkBuddy ↔ OpenClaw 上下文转换 |
| 结果格式化 | `openclaw/fbs-bookwriter-lrz/adapter/result-formatter.mjs` | 脚本输出格式适配 |
| 宿主桥接 | `scripts/lib/openclaw-host-bridge.mjs` | OpenClaw 宿主能力检测 |
| 技能配置 | `openclaw/fbs-bookwriter-lrz/skill.json` | OpenClaw 标准技能配置 |

---

## 文件结构

```
fbs-bookwriter-lrz/
├── openclaw/                    # OpenClaw 适配层
│   └── fbs-bookwriter-lrz/
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

### 各阶段说明

| 阶段 | 功能 | 核心脚本 |
|------|------|----------|
| S0 | 素材整理、原料盘点 | `init-fbs-multiagent-artifacts.mjs` |
| S1/S2 | 大纲规划、章节设计 | `write-outline.mjs` |
| S3 | 正式写稿、实时进度 | `write-chapter.mjs` |
| S3.5 | 扩写（可选） | `expand-content.mjs` |
| S4 | 质检、去 AI 味 | `quality-auditor-lite.mjs` |
| S5/S6 | 导出、归档 | `export-to-pdf.mjs` / `merge-chapters.mjs` |

### S3 写稿规则（强制）

- 每轮最多修改 **2 个文件**，完成 1 个再推进下 1 个
- **禁止**同一章节并行写多段
- **禁止**跳过 `s3-start-gate` 门禁
- **禁止**无备份大段删改
- 进度条**必须实时**输出，不能写完所有章节后才输出

### S4 质检标准

使用 `quality-auditor-lite.mjs` 执行 S/P/C/B 四层质检：

| 层 | 定位 | 规则数 |
|----|------|-------|
| S | 句级 | 6 |
| P | 段级 | 4 |
| C | 章级 | 5 |
| B | 篇级 | 6 |

**通过条件**：综合分 ≥ 7.5 **且** G（门禁）全绿。

### 🕐 总时间预估（强制执行）

进入 S3 写稿前，必须估算全书预计耗时并告知用户：

```
📖 书名：{书名}
⏱️ 预估总用时：约 {N} 分钟（{M} 章 × 平均 {X} 分钟/章）
📊 当前进度：{已完成章数}/{总章数} 章
⏳ 预计剩余：约 {R} 分钟
```

**Part（卷/分区）支持**：

书稿可按 Part（部分/卷）组织章节：

```
📦 Part 1（{第1部分章数} 章）— 已完成
📦 Part 2（{第2部分章数} 章）— 进行中，第 5/12 章
⏱️ Part 2 预估剩余：约 {R} 分钟

开始写第 5 章？[确认/取消]
```

#### 📊 实时进度显示（仅长任务启用）

**进度条仅在预估耗时 >2 分钟时显示**，短任务直接执行不显示进度。

**进度条格式**：
```
第 1/10 章完成 ████████░░░░░░░░░░░  10%  预计还需：8 分钟
第 2/10 章完成 ████████████░░░░░░░  20%  预计还需：7 分钟
```

- 显示格式：`[已完成]/[总章数] 章完成 ████░░░░░░░░░░░░░  XX%  预计还需：X 分钟`
- 使用 ASCII 方块字符：`█`（已完成）+ `░`（未完成）
- 进度条长度：20 个字符
- 剩余时间根据已完成章节的平均耗时动态估算

**预估算法**：
- 全书预估时间（分钟）= 预估总字数 / 1000 × 2
- 单章平均耗时（分钟）= 已完成章节平均耗时（首次按 2 分钟估算）
- 剩余时间（分钟）= 剩余章节数 × 单章平均耗时

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

---

## ⚠️ 错误处理规范

### 错误信息格式

脚本执行失败时，错误信息采用以下格式：

```
⚠️ 调用<功能名>失败，<错误类型>：<具体原因>
  💡 建议：<解决方案>
```

### 常见错误对照表

| 脚本 | 操作名 | 常见错误 & 建议 |
|------|--------|----------------|
| `intake-router.mjs` | 入口路由 | 网络错误 → 检查网络；路径错误 → 检查 `--book-root` |
| `init-fbs-*.mjs` | 初始化项目 | 目录已存在 → 加 `--force`；权限不足 → 检查目录权限 |
| `quality-auditor-lite.mjs` | 质量审计 | 未找到 chapter-status → 确认已初始化 |
| `session-exit.mjs` | 退出保存 | 无 `.fbs/` → 项目未初始化 |
| `export-to-pdf.mjs` | 导出 PDF | 缺少 puppeteer → 执行 `npm install puppeteer` |
| `export-to-docx.mjs` | 导出 DOCX | 缺少 html-to-docx → 执行 `npm install html-to-docx` |

### AI 行为规范

1. **不要直接显示原始报错堆栈**
2. **优先展示脚本输出的错误信息**
3. **给出可执行的建议**
4. **不要报令人困惑的技术术语**

---

## 📚 相关文档

- [主 README](../README.md) - WorkBuddy 版本安装指南
- [双通道开发指南](../docs/DEVELOPMENT.md) - 维护注意事项
- [变更日志](../CHANGELOG.md) - 版本更新记录
