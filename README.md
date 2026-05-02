# 📖 FBS-Writer - 福帮手长文档写作工具

> 高质量长文档手稿工具链：书籍、手册、白皮书、行业指南、长篇报道、深度专题

[![Version](https://img.shields.io/badge/version-2.1.2-blue.svg)](https://github.com/sawakso/fbs-writer)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-WorkBuddy%20%7C%20OpenClaw%20%7C%20CodeBuddy-blue.svg)](#多平台支持)

---

## ✨ 特性

- 📖 **全流程覆盖**：S0 素材整理 → S6 交付归档
- 🌐 **联网查证**：宿主允许时启用，离线自动降级
- 🔍 **S/P/C/B 分层审校**：去 AI 味、质量自检
- 📊 **实时进度**：长任务显示进度条，短任务静默执行
- 🌏 **中文排版**：自动优化中文排版规范
- 📦 **多格式导出**：Markdown / HTML / DOCX / PDF
- 🤖 **多 Agent 协作**：支持团队协作写作
- 🔄 **会话恢复**：随时中断，随时继续

---

## 🚀 快速开始

### 方式一：从技能市场安装（推荐）

| 平台 | 安装方式 |
|------|----------|
| **WorkBuddy** | 在技能管理中搜索 `fbs-writer`，点击安装 |
| **OpenClaw** | 在技能市场中搜索 `fbs-writer`，点击安装 |
| **CodeBuddy** | 在插件市场中搜索 `fbs-writer`，点击安装 |

### 方式二：手动安装

#### WorkBuddy

```bash
# 克隆仓库
git clone https://github.com/sawakso/fbs-writer.git ~/.workbuddy/skills/fbs-writer

# 安装依赖
cd ~/.workbuddy/skills/fbs-writer
npm install
```

#### OpenClaw

```bash
# 克隆仓库
git clone https://github.com/sawakso/fbs-writer.git ~/.openclaw/skills/fbs-writer

# 安装依赖
cd ~/.openclaw/skills/fbs-writer
npm install

# 重启 OpenClaw
openclaw gateway restart
```

#### CodeBuddy

```bash
# 克隆仓库
git clone https://github.com/sawakso/fbs-writer.git ~/.codebuddy/plugins/fbs-writer

# 安装依赖
cd ~/.codebuddy/plugins/fbs-writer
npm install
```

---

## 🎯 触发词

对 AI 说以下任一触发词即可启动：

| 触发词 | 功能 |
|--------|------|
| 写书 / 出书 | 长篇创作 |
| 写手册 | 操作指南 |
| 写白皮书 | 行业报告 |
| 写行业指南 | 行业指导 |
| 定大纲 / 写章节 | 结构规划 |
| 质量自检 / 去 AI 味 | 质量审计 |
| 导出 / 合并全稿 | 交付产出 |
| 整理素材 / 原料盘点 | 素材管理 |

---

## 📊 写作流程

```
S0 素材整理 → S1/S2 大纲规划 → S3 正式写稿 → S3.5 扩写 → S4 质检 → S5/S6 交付归档
```

### 各阶段说明

| 阶段 | 功能 | 核心脚本 |
|------|------|----------|
| **S0** | 素材整理、原料盘点 | `init-fbs-multiagent-artifacts.mjs` |
| **S1/S2** | 大纲规划、章节设计 | `write-outline.mjs` |
| **S3** | 正式写稿、实时进度 | `write-chapter.mjs` |
| **S3.5** | 扩写（可选） | `expand-content.mjs` |
| **S4** | 质检、去 AI 味 | `quality-auditor.mjs` |
| **S5/S6** | 导出、归档 | `export-to-pdf.mjs` / `merge-chapters.mjs` |

---

## 🛠️ 核心命令

```bash
# 新建项目
node scripts/init-fbs-multiagent-artifacts.mjs --book-root ./my-book

# 意图路由
node scripts/intake-router.mjs --book-root ./my-book --intent write

# 合并全稿
node scripts/merge-chapters.mjs --book-root ./my-book

# 质量自检
node scripts/quality-auditor-lite.mjs --book-root ./my-book

# 导出 PDF
node scripts/export-to-pdf.mjs ./my-book/full-manuscript.md ./output.pdf

# 导出 Word
node scripts/export-to-docx.mjs ./my-book/full-manuscript.md ./output.docx

# 会话退出（保存进度）
node scripts/session-exit.mjs --book-root ./my-book --json
```

---

## 📦 安装依赖

### 核心依赖（自动安装）

```bash
npm install
```

核心依赖：glob、iconv-lite

### 可选导出依赖

按需安装，不装也能用 Markdown 写作：

```bash
# Word 导出
npm install html-to-docx

# PDF 导出（含 Chromium，约 300MB）
npm install puppeteer
```

---

## 🌐 联网查证

当宿主允许时，自动启用联网查证功能：
- ✅ 事实核查
- ✅ 数据更新
- ✅ 引用来源验证

离线时自动降级，不影响写作流程。

---

## 📁 项目结构

```
fbs-writer/
├── SKILL.md                  # WorkBuddy 入口（YAML frontmatter）
├── README.md                 # 本文档
├── CHANGELOG.md              # 变更日志
├── scripts/                  # ⭐ 共享代码库（三通道共用）
│   ├── lib/                 # 核心库
│   │   ├── user-errors.mjs         # 统一异常处理
│   │   ├── ux-progress-enhanced.mjs  # 进度追踪
│   │   └── openclaw-host-bridge.mjs  # 宿主能力检测
│   ├── intake-router.mjs    # 意图路由
│   ├── init-fbs-multiagent-artifacts.mjs  # 项目初始化
│   ├── merge-chapters.mjs   # 合并章节
│   ├── quality-auditor.mjs  # 质量审计
│   └── export-to-*.mjs      # 导出脚本
├── openclaw/fbs-writer/     # OpenClaw 适配层
│   ├── skill.json           # OpenClaw 标准配置
│   ├── SKILL.md             # OpenClaw 专用入口
│   ├── index.mjs            # 适配层索引
│   └── adapter/             # 上下文映射器 + 结果格式化器
├── codebuddy/               # CodeBuddy 配置
│   └── channel-manifest.json
├── .codebuddy/               # CodeBuddy agents/providers
├── .codebuddy-plugin/        # CodeBuddy 插件配置
├── docs/                    # 文档
│   ├── DEVELOPMENT.md      # 开发指南
│   └── openclaw/README.md   # OpenClaw 安装指南
├── references/              # 详细规范文档
├── scene-packs/             # 场景包配置
└── assets/                  # 模板与样式
```

---

## 🔧 环境要求

| 项目 | 最低版本 |
|------|---------|
| **Node.js** | 18+ |
| **npm** | 随 Node 安装 |
| **Git** | 任意版本 |

---

## 🐛 故障排查

### 问题：脚本执行报错 `MODULE_NOT_FOUND`

```bash
# 检查依赖是否安装
npm list

# 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 问题：PDF 导出失败

```bash
# 检查 puppeteer 是否安装
npm list puppeteer

# 如未安装，执行
npm install puppeteer
```

### 问题：中文乱码？

A: 确保文件编码为 UTF-8，Windows 用户优先用 utf-8-sig 编码。

### 问题：宿主检测不正确？

```bash
# 手动检测
node scripts/lib/openclaw-host-bridge.mjs --detect
```

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [SKILL.md](SKILL.md) | WorkBuddy 技能入口文档 |
| [openclaw/README.md](openclaw/README.md) | OpenClaw 版本安装与使用说明 |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 双通道开发指南与维护注意事项 |
| [CHANGELOG.md](CHANGELOG.md) | 变更日志 |
| [docs/](docs/) | 更多文档 |

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发指南

请阅读 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) 了解：
- 三通道架构设计
- 开发流程
- 测试策略
- 发布流程

### 贡献步骤

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

## 📄 开源协议

本项目采用 MIT 协议开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🙏 致谢

- [Node.js](https://nodejs.org/) - 运行时环境
- [Puppeteer](https://pptr.dev/) - PDF 导出支持
- [html-to-docx](https://github.com/lalalic/html-to-docx) - Word 导出支持

---

## 📮 联系方式

- 作者：福帮手团队
- GitHub：[sawakso/fbs-writer](https://github.com/sawakso/fbs-writer)
- 问题反馈：[GitHub Issues](https://github.com/sawakso/fbs-writer/issues)

---

**福帮手出品** 📖 | 让长文档写作更简单
