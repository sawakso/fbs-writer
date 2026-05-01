# FBS-Writer 安装指南

> 福帮手长文档写作工具 v2.1.2 — OpenClaw 适配版

## 环境要求

| 项目 | 最低版本 |
|------|---------|
| Node.js | 18+ |
| npm | 随 Node 安装 |
| Git | 任意版本 |

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/sawakso/fbs-writer.git ~/.qclaw/skills/fbs-writer
```

### 2. 安装依赖

```bash
cd ~/.qclaw/skills/fbs-writer
npm install
```

核心依赖（自动安装）：glob、iconv-lite

### 3. 安装可选导出依赖

按需安装，不装也能用 Markdown 写作：

```bash
# Word 导出
npm install html-to-docx

# PDF 导出（含 Chromium，约 300MB）
npm install puppeteer
```

### 4. 重启 OpenClaw

```bash
openclaw gateway restart
```

## 验证安装

```bash
# 环境预检
node scripts/env-preflight.mjs --json

# 宿主检测
node scripts/lib/openclaw-host-bridge.mjs --detect
```

## 快速开始

对 AI 说以下任一触发词即可启动：

- 写书 / 出书 — 长篇创作
- 写手册 — 操作指南
- 写白皮书 — 行业报告
- 写行业指南 — 行业指导
- 定大纲 / 写章节 / 导出

## 写作流程

```
S0 素材整理 → S1/S2 大纲规划 → S3 正式写稿 → S4 质检 → S5/S6 交付归档
```

核心命令速查：

| 操作 | 命令 |
|------|------|
| 新建项目 | `node scripts/init-fbs-multiagent-artifacts.mjs --book-root <路径>` |
| 开场路由 | `node scripts/intake-router.mjs --book-root <路径> --intent <类型>` |
| 合并全稿 | `node scripts/merge-chapters.mjs --book-root <路径>` |
| 质量自检 | `node scripts/quality-auditor-lite.mjs --book-root <路径>` |
| 导出 Word | `node scripts/export-to-docx.mjs <输入.md> [输出.docx]` |
| 导出 PDF | `node scripts/export-to-pdf.mjs <输入.md> [输出.pdf]` |

## 常见问题

**Q: 提示缺少依赖？**
A: 进入技能目录执行 `npm install`，导出类再装对应的可选包。

**Q: WorkBuddy 报错？**
A: OpenClaw 下自动降级为 node-cli 模式，属正常行为。

**Q: 中文乱码？**
A: 确保文件编码为 UTF-8，Windows 用户优先用 utf-8-sig 编码。

## 项目结构

```
fbs-writer/
├── SKILL.md          # 技能入口（AI 必读）
├── scripts/          # 核心脚本
│   ├── intake-router.mjs         # 意图路由
│   ├── init-fbs-multiagent-artifacts.mjs  # 项目初始化
│   ├── merge-chapters.mjs        # 合并章节
│   ├── quality-auditor-lite.mjs  # 质检
│   └── export-to-*.mjs          # 导出
├── references/       # 详细规范文档
├── scene-packs/      # 场景包配置
└── assets/           # 模板与样式
```
