# 📖 FBS-BookWriter-LRZ - 高质量长文档手稿工具链

> **定位**：高质量长文档手稿工具链 —— 专业级手稿（非终稿），人在循环中引领、把关、担责

[![Version](https://img.shields.io/badge/version-2.1.2-blue.svg)](https://github.com/sawakso/fbs-bookwriter-lrz)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-WorkBuddy%20%7C%20OpenClaw%20%7C%20CodeBuddy-blue.svg)](#多平台支持)

---

## ✨ 特性

> **核心定位**：高质量长文档手稿工具链 —— 人在循环中引领、把关、担责

- 📖 **专业级手稿**（非终稿）：生成需人工审核、修改的草稿，而非直接可发表的终稿
- 📖 **全流程覆盖**：S0 素材整理 → S6 交付归档
- 🌐 **联网查证**：宿主允许时启用，离线自动降级
- 🔍 **S/P/C/B 分层审校**：内置去 AI 味、质量自检
- 📊 **实时进度**：长任务显示进度条，短任务静默执行
- 🌏 **中文排版**：自动优化中文排版规范
- 📦 **默认 DOCX 输出**：可直接编辑的手稿格式（支持 MD / HTML / PDF）
- 🤝 **多 Agent 协作**：支持团队协作写作
- 🔄 **会话恢复**：随时中断，随时继续

---

## 🚀 快速开始

### 方式一：从技能市场安装（推荐）

| 平台 | 安装方式 |
|------|----------|
| **WorkBuddy** | 在技能管理中搜索 `fbs-bookwriter-lrz`，点击安装 |
| **OpenClaw** | 在技能市场中搜索 `fbs-bookwriter-lrz`，点击安装 |
| **CodeBuddy** | 在插件市场中搜索 `fbs-bookwriter-lrz`，点击安装 |

### 方式二：手动安装

#### WorkBuddy

```bash
# 克隆仓库
git clone https://github.com/sawakso/fbs-bookwriter-lrz.git ~/.workbuddy/skills/fbs-bookwriter-lrz

# 安装依赖
cd ~/.workbuddy/skills/fbs-bookwriter-lrz
npm install
```

#### OpenClaw

```bash
# 克隆仓库
git clone https://github.com/sawakso/fbs-bookwriter-lrz.git ~/.openclaw/skills/fbs-bookwriter-lrz

# 安装依赖
cd ~/.openclaw/skills/fbs-bookwriter-lrz
npm install
```

#### CodeBuddy

```bash
# 克隆仓库
git clone https://github.com/sawakso/fbs-bookwriter-lrz.git .codebuddy/skills/fbs-bookwriter-lrz

# 安装依赖
cd .codebuddy/skills/fbs-bookwriter-lrz
npm install
```

---

## 📚 使用流程

FBS-Writer 采用六阶段写作流程：

| 阶段 | 名称 | 说明 |
|------|------|------|
| S0 | 素材激活 | 整理、结构化原始素材 |
| S1 | 大纲生成 | 生成书籍/文档大纲 |
| S2 | 定大纲 | 确认并锁定大纲 |
| S3 | 写稿 | 按大纲生成各章节（支持预估时间） |
| S4 | 质量审查 | 多维度质量检查 |
| S5 | 交叉审查 | 多 Agent 交叉验证 |
| S6 | 交付归档 | 导出、归档 |

---

## 🎯 适用场景

| 场景 | 说明 |
|------|------|
| **网络小说** | 长篇连载，支持续写推进、情节修改 |
| **技术文档** | API 文档、用户手册、技术白皮书 |
| **学术写作** | 论文、文献综述、开题报告 |
| **商业文档** | 行业分析报告、商业计划书 |
| **培训材料** | 课程手册、培训文档 |

---

## 🔧 技术架构

### 三通道支持

| 平台 | 识别文件 | 状态 |
|------|---------|------|
| WorkBuddy | `SKILL.md` | ✅ 支持 |
| OpenClaw | `openclaw/fbs-bookwriter-lrz/skill.json` | ✅ 支持 |
| CodeBuddy | `.codebuddy-plugin/plugin.json` | ✅ 支持 |

### 核心能力

- **原子能力有机组合**：脚本化、可编排、可复用
- **人在循环中把关**：生成手稿，非终稿，保留人工审核环节
- **去 AI 味内置**：默认开启去 AI 味处理（可关闭）
- **跨会话状态持久化**：随时中断，随时继续

---

## 📝 测试版本命名规范

> **原则**：保持语义不变，可加后缀区分测试版本

- ✅ 推荐：`fbs-bookwriter-lzz`（lzz 为测试后缀）
- ✅ 推荐：`fbs-bookwriter-v212-test`
- ❌ 禁止：`fbs-bookwriter-book`（改变"book"语义）
- ❌ 禁止：`writer-tool`（简化导致失去细分定位）

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

## 📮 联系

- 问题反馈：[GitHub Issues](https://github.com/sawakso/fbs-bookwriter-lrz/issues)
- 讨论区：[GitHub Discussions](https://github.com/sawakso/fbs-bookwriter-lrz/discussions)
