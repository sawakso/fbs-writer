# FBS-Writer OpenClaw 适配版

> 福帮手长文档**手稿**工具链 v2.1.2 — OpenClaw 原生适配版

## 📖 简介

**产品定位**：高质量长文档**手稿**工具链（非终稿）

**核心价值**：
- 专业级手稿：AI 生成 + 人在循环引领/把关/担责
- 支持联网查证（离线自动降级）
- S/P/C/B 分层审校体系

**适用场景**：书籍、手册、白皮书、行业指南、长篇报道、深度专题

- ✅ **原生 OpenClaw 技能格式** (`skill.json`)
- ✅ **上下文映射器** (WorkBuddy → OpenClaw 意图转换)
- ✅ **结果格式化器** (进度条、错误处理的 OpenClaw 适配)
- ✅ **宿主能力检测** (自动识别 OpenClaw/WorkBuddy/CodeBuddy)

## 📁 目录结构

```
openclaw/fbs-writer/
├── skill.json              # OpenClaw 标准技能配置
├── SKILL.md               # OpenClaw 专用入口文档
├── index.mjs              # 适配层索引
├── adapter/
│   ├── context-mapper.mjs    # 上下文映射器
│   └── result-formatter.mjs  # 结果格式化器
├── commands/              # OpenClaw 命令定义
├── prompts/              # OpenClaw 提示词模板
└── skills/               # OpenClaw 子技能
```

## 🚀 安装

### 方式一：从 OpenClaw 技能市场安装（推荐）

1. 打开 OpenClaw 技能管理
2. 搜索 `fbs-writer`
3. 点击安装

### 方式二：手动安装

```bash
# 克隆仓库到 OpenClaw 技能目录
git clone https://github.com/sawakso/fbs-writer.git ~/.openclaw/skills/fbs-writer

# 安装依赖
cd ~/.openclaw/skills/fbs-writer
npm install

# 安装可选导出依赖
npm install html-to-docx  # Word 导出
npm install puppeteer     # PDF 导出（约 300MB）
```

### 验证安装

```bash
cd ~/.openclaw/skills/fbs-writer

# 环境预检
node scripts/env-preflight.mjs --json

# 宿主检测（应该显示 openclaw）
node scripts/lib/openclaw-host-bridge.mjs --detect
```

## 🎯 快速开始

对 AI 说以下任一触发词即可启动：

| 触发词 | 功能 |
|--------|------|
| 写书 / 出书 | 长篇创作 |
| 写手册 | 操作指南 |
| 写白皮书 | 行业报告 |
| 写行业指南 | 行业指导 |
| 定大纲 / 写章节 | 结构规划 |
| 导出 / 合并全稿 | 交付产出 |

## 🔄 与 WorkBuddy 版本的区别

| 特性 | WorkBuddy 版 | OpenClaw 版 |
|------|--------------|-------------|
| 技能格式 | `SKILL.md` (YAML frontmatter) | `skill.json` (OpenClaw 标准) |
| 入口文档 | 根目录 `SKILL.md` | `openclaw/fbs-writer/SKILL.md` |
| 适配层 | 无（原生） | 有（`adapter/`） |
| 宿主检测 | 基础 | 增强（三平台识别） |
| 结果格式 | 直接输出 | 适配层格式化 |

## 📊 写作流程

```
S0 素材整理 → S1/S2 大纲规划 → S3 正式写稿 → S4 质检 → S5/S6 交付归档
```

### 各阶段说明

| 阶段 | 功能 | 核心脚本 |
|------|------|----------|
| S0 | 素材整理、原料盘点 | `init-fbs-multiagent-artifacts.mjs` |
| S1/S2 | 大纲规划、章节设计 | `write-outline.mjs` |
| S3 | 正式写稿、实时进度 | `write-chapter.mjs` |
| S3.5 | 扩写（可选） | `expand-content.mjs` |
| S4 | 质检、去 AI 味 | `quality-auditor.mjs` |
| S5/S6 | 导出、归档 | `export-to-pdf.mjs` / `merge-chapters.mjs` |

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

# 会话退出（保存进度）
node scripts/session-exit.mjs --book-root ./my-book --json
```

## 🌐 联网查证

当宿主允许时，自动启用联网查证功能：
- 事实核查
- 数据更新
- 引用来源验证

离线时自动降级，不影响写作流程。

## 📝 输出规范

- **强制中文输出**（铁律，无豁免）
- **禁止英文输出**（面向用户的文本）
- **进度条显示**（长任务 >2 分钟）
- **友好错误提示**（通过 `user-errors.mjs`）

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

### 问题：宿主检测不正确

```bash
# 手动检测
node scripts/lib/openclaw-host-bridge.mjs --detect

# 查看详细快照
node -e "import('scripts/lib/openclaw-host-bridge.mjs').then(m => console.log(m.createOpenClawHostSnapshot()))"
```

## 📚 相关文档

- [主 README](../README.md) - WorkBuddy 版本安装指南
- [双通道开发指南](../docs/DEVELOPMENT.md) - 维护注意事项
- [变更日志](../CHANGELOG.md) - 版本更新记录

## 📄 授权

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**福帮手出品** 📖
