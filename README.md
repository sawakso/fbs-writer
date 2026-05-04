# 📖 FBS-BookWriter-LRZ - 高质量长文档手稿工具链

> **定位**：高质量长文档手稿工具链 —— 专业级手稿（非终稿），人在循环中引领、把关、担责

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/sawakso/fbs-bookwriter-lrz)
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
- 📊 **智能进度报告**：按书稿规模自动调整节奏 — 小书(≤5万字)每章报告，中等(5-20万字)每3章，大长篇(20-100万字)每5-8章，巨著(>100万字)每10+章或每卷
- 🌏 **中文排版**：自动优化中文排版规范
- 📦 **默认 DOCX 输出**：可直接编辑的手稿格式（支持 MD / HTML / PDF）
- 🤝 **多 Agent 协作**：支持团队协作写作
- 🔄 **会话恢复**：随时中断，随时继续
- 🆕 **新用户引导**：首次使用自动激活 SOP，问目录→初始化→三步引导
- 📁 **跨会话项目持久化**：全局注册表记录所有书稿，新会话直接列出已有项目
- 🎭 **网文平台适配**：内置番茄小说/起点中文网/晋江文学城三平台交付规范
- ✏️ **降重改写预设**：六大策略（句式变换→同义词→语序→段落重组→修辞→数据微调）
- 🎯 **预设选择**：写书/写小说/定大纲时自动弹出平台选择卡片

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

### 🍎 macOS 支持

| 项目 | 说明 |
|------|------|
| 平台 | ✅ 完全支持 macOS（Intel / Apple Silicon） |
| 前置依赖 | Node.js 18+（Homebrew 安装：`brew install node@18`） |
| 路径格式 | `~/.openclaw/skills/...` — 与 Linux 完全一致，不支持 Windows 反斜杠路径 |
| 重定向语法 | 使用 `> /dev/null 2>&1`（与 Linux 相同） |
| OS 自动检测 | 每次会话自动检测平台类型，无需手动设置 |

安装方式同 Linux，只是 home 路径在 `/Users/<用户名>/` 下。

---

## 📚 使用流程

FBS-BookWriter-LRZ 采用六阶段写作流程：

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
| **网络小说** | 长篇连载，支持续写推进、情节修改，适配番茄小说/起点中文网/晋江文学城 |
| **技术文档** | API 文档、用户手册、技术白皮书 |
| **学术写作** | 论文、文献综述、开题报告 |
| **商业文档** | 行业分析报告、商业计划书 |
| **培训材料** | 课程手册、培训文档 |

---

## 📂 项目结构

```
fbs-bookwriter-lrz/
├── 📖 README.md                    # 项目入口文档
├── 📖 SKILL.md                     # SKILL 技能入口
├── 📦 package.json                 # Node.js 依赖配置
│
├── 📁 scripts/                    # ⭐ 核心脚本目录（187个脚本）
│   ├── 📁 lib/                     # ⭐ 共享代码库（43个核心库）
│   │   ├── user-errors.mjs         # 统一异常处理（UserError）
│   │   ├── ux-progress-enhanced.mjs # 进度追踪系统
│   │   ├── openclaw-host-bridge.mjs  # OpenClaw 宿主桥接
│   │   ├── channel-pack.mjs        # 三通道适配层
│   │   ├── intent-canonical.mjs    # 意图规范化
│   │   ├── scale-tiers.mjs         # 批量生成档位
│   │   └── ...                     # 38个更多核心库
│   │
│   ├── init-fbs-multiagent-artifacts.mjs  # S0 初始化
│   ├── write-outline.mjs           # S1 大纲生成
│   ├── expansion-workflow.mjs      # S3 内容扩写
│   ├── polish-workflow.mjs         # S4 润色优化
│   ├── quality-auditor.mjs         # S5 质量审计
│   ├── merge-chapters.mjs          # S6 合并章节
│   ├── export-to-pdf.mjs          # S6 PDF导出
│   ├── export-to-docx.mjs         # S6 DOCX导出
│   ├── split-workflow-full.mjs    # 流程拆分工具
│   ├── fbs-doctor.mjs             # 技能预检诊断
│   ├── fbs-cleanup.mjs            # 缓存清理
│   ├── expansion-gate.mjs         # 扩写门禁检查
│   └── [175+ 更多脚本...]          # 各类辅助脚本
│
├── 📁 docs/                        # 📚 开发文档
│   ├── DEVELOPMENT.md             # ⭐ 开发指南
│   ├── TEST-CASES.md              # 基础测试用例（42个）
│   ├── TEST-CASES-PHASES.md       # ⭐ 分阶段测试用例（45个）
│   └── history/                   # 历史文档
│
├── 📁 openclaw/                    # ⭐ OpenClaw 适配层
│   └── fbs-bookwriter-lrz/         # OpenClaw 技能包
│       ├── skill.json              # 技能配置
│       ├── SKILL.md                # OpenClaw 入口
│       ├── index.mjs               # 适配层索引
│       └── adapter/                # 适配器
│           ├── context-mapper.mjs  # 上下文映射器
│           └── result-formatter.mjs # 结果格式化
│
├── 📁 .codebuddy/                  # CodeBuddy 配置
│   ├── agents/                     # Agent 定义
│   └── providers/                  # Provider 配置
│
├── 📁 scene-packs/                 # ⭐ 场景包
│   ├── official-schema.json        # 官方场景模式
│   ├── enterprise.json             # 企业场景
│   └── user-config.json            # 用户自定义
│
├── 📁 references/                  # 📖 写作规范参考
│   ├── 01-core/                    # 核心规范
│   │   ├── s3-expansion-phase.md   # S3扩写规范
│   │   ├── s3-refinement-phase.md  # S3精炼规范
│   │   ├── section-3-workflow.full.md # 完整工作流
│   │   └── intent-canonical.json   # 意图规范
│   └── scene-packs/                # 场景包定义
│
├── 📁 assets/                      # 资源文件
│   ├── books.config.mjs            # 书稿配置
│   └── build.mjs                   # 构建脚本
│
└── CHANGELOG.md                   # 📝 变更日志
```

---

## 🎯 核心模块速查

### 🔥 共享代码层 (`scripts/lib/`)

| 文件 | 功能 | 重要性 |
|------|------|--------|
| `user-errors.mjs` | 统一异常处理，支持友好错误提示 | ⭐⭐⭐ |
| `ux-progress-enhanced.mjs` | 进度追踪，支持长/短任务自适应 | ⭐⭐⭐ |
| `openclaw-host-bridge.mjs` | OpenClaw 宿主环境桥接 | ⭐⭐⭐ |
| `channel-pack.mjs` | 三通道（WB/OC/CB）适配 | ⭐⭐ |
| `intent-canonical.mjs` | 用户意图规范化 | ⭐⭐ |
| `scale-tiers.mjs` | 批量生成档位配置（S/M/L/XL） | ⭐⭐ |
| `quality-runtime.mjs` | 质量检查运行时 | ⭐⭐ |
| `memory-adapter.mjs` | 记忆层适配 | ⭐⭐ |

### 📊 六阶段工作流

| 阶段 | 入口脚本 | 核心功能 |
|------|---------|---------|
| S0 | `init-fbs-multiagent-artifacts.mjs` | 项目初始化、目录创建 |
| S1 | `write-outline.mjs` | 大纲生成、章节规划 |
| S2 | 素材收集 | 素材整理、关键词提取 |
| S3 | `expansion-workflow.mjs` | 内容扩写、Auto-Run |
| S4 | `polish-workflow.mjs` | 润色、去AI味 |
| S5 | `quality-auditor.mjs` | 质量审计、多维检查 |
| S6 | `export-to-*.mjs` | PDF/DOCX/MD导出 |

### 🌐 三通道支持

```
┌─────────────────────────────────────────────────────────┐
│                    FBS-BookWriter-lrz                   │
├──────────────┬──────────────┬───────────────────────────┤
│  WorkBuddy   │   OpenClaw   │       CodeBuddy           │
├──────────────┼──────────────┼───────────────────────────┤
│ SKILL.md     │ openclaw/    │ .codebuddy/               │
│              │ skill.json   │   plugin.json             │
├──────────────┼──────────────┼───────────────────────────┤
│ scripts/     │ adapter/     │ providers/                │
│ (直接执行)    │ (格式化)      │   (Agent调用)             │
└──────────────┴──────────────┴───────────────────────────┘
```

### 📚 场景包 (`references/scene-packs/`)

| 场景 | 配置 | 说明 |
|------|------|------|
| `general` | 通用写作规范 | 书籍、手册、通用长文档 |
| `webnovel` | 网文平台规范 | 番茄小说 / 起点中文网 / 晋江文学城 |
| `genealogy` | 家谱/家史 | 家族溯源、世系图 |
| `consultant` | 顾问/咨询报告 | 商业咨询文档 |
| `ghostwriter` | 代撰/影子写作 | 代写场景 |
| `training` | 培训教材 | 课程讲义、培训手册 |
| `personal-book` | 个人传记 | 自传、回忆录 |
| `whitepaper` | 白皮书 | 行业报告、研究白皮书 |
| `report` | 调查报告 | 深度报道、调研报告 |

---

## 📊 写作字数分级管理（Scale Tiers）

> 全自动分级策略，根据**目标字数**和**章节数**自动匹配档位，不同档位对应不同写作/质检策略。

### 档位总览（用户视角）

| 档位 | 用户口语目标 | 内部上限 | Auto-Run 策略 | 质检策略 |
|------|--------------|----------|----------------|----------|
| **S** | 写本小册子 / 短篇（≈ 3 万字） | 5 万字 | 单会话可完成 | 全量精检 |
| **M** | 写一本书 / 手册（≈ 10 万字） | 50 万字 | 每 2 章暂停，断点续写 | Panorama → Deep |
| **L** | 写一部长篇 / 全集（几十万字） | 200 万字 | 每 2 章暂停，分卷执行 | Panorama + 高风险抽样 |
| **XL** | 写百万字巨著 / 丛书（百万字以上） | 无上限 | 分卷，分目录批次执行 | 分卷并行 + 分层抽样 |

### 分级规则（双维度取高）

```
按用户口语目标字数量级判定：
  ≈ 3 万字   → S 档
  ≈ 10 万字  → M 档
  几十万字    → L 档
  百万字以上  → XL 档

再与章节数交叉校验，取较高档位（避免单维低估）：
  章数 ≤ 10  → S 档
  章数 ≤ 50  → M 档
  章数 ≤ 150 → L 档
  章数 ＞ 150 → XL 档
```

### 分卷策略（XL 档专用）

```
总字数 >= 200 万字  →  自动启用分卷模式

卷大小配置：
  M 档卷：  8 万字/卷
  L 档卷：  15 万字/卷
  XL 档卷： 30 万字/卷（推荐）

分卷逻辑：
  第1卷：第1-30章（约30万字）
  第2卷：第31-60章（约30万字）
  ...
```

### Auto-Run 断点续生成

| 档位 | 分批粒度 | 暂停点 | 续写方式 |
|------|------------|--------|----------|
| S | 不分批 | - | 直接完成 |
| M | 每 2 章 | 第2/4/6...章后 | 说「继续扩写」 |
| L | 每 2 章 | 第2/4/6...章后 | 说「继续扩写」 |
| XL | 每卷完成后 | 每卷末尾 | 说「继续下一卷」 |

### 质检策略对照

```
S 档：全量精检
  └─ 每章逐字检查，AI味、术语、敏感词全覆盖

M 档：Panorama → Deep
  └─ 先全景扫描，再对问题章节深度检查

L 档：Panorama + 高风险抽样
  └─ 全景扫描 + 随机抽取 20% 章节精检

XL 档：分卷并行 + 分层抽样
  └─ 每卷独立质检，卷间交叉抽样验证
```

### 配置文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 档位定义 | `references/05-ops/scale-tiers.json` | 唯一真源，全项目引用 |
| 档位逻辑 | `scripts/lib/scale-tiers.mjs` | 档位判定、分卷计算 |
| 扩写计划 | `scripts/repair-expansion-plan-skeleton.mjs` | 单章上限 20 万字 |

---

## 🔧 技术架构】

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

### ✏️ 改写预设

| 预设 | 命令 | 说明 |
|------|------|------|
| **降重改写** | 说「降重改写」或「降重」 | 六大策略：句式变换→同义词替换→语序调整→段落重组→修辞替换→数据微调 |
| **去AI味** | 说「去AI味」 | 40+种AI模式检测，逐章替换 |
| **自有升级** | `rewrite-plan --mode self-upgrade` | 自有旧书内容升级 |
| **海外本地化** | `rewrite-plan --mode global-localization` | 面向海外读者的内容本地化 |
| **爆款改写** | `rewrite-plan --mode bestseller-reframe` | 按爆款结构重构内容 |

### 🎯 预设选择流程

写书/写小说/定大纲时自动弹出预设选择：

```
写书 → 意图菜单 → 预设选择卡片 → 写入 .fbs/active-preset.json → 按预设执行
写小说 → 预设选择卡片（通用小说/番茄/起点/晋江）→ 按平台规范执行
定大纲 → 有书稿则问「为哪本定大纲？」→ 无书稿则走意图菜单+预设选择
```

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
