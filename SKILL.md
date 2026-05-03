---
name: fbs-bookwriter-lrz
version: 2.1.2
plugin-id: fbs-bookwriter-lrz-v212
description: "福帮手出品 | 高质量长文档手稿工具链：书籍、手册、白皮书、行业指南、长篇报道、深度专题；支持联网查证（宿主允许时启用，离线自动降级）、S/P/C/B 分层审校、中文排版与 MD/HTML 交付。触发词：福帮手、福帮手写书skill、福帮手写书、写书、出书、写长篇、写手册、写白皮书、写行业指南、协作写书、定大纲、写章节、封面、插图、排版构建、导出、去AI味、质量自检、图文书、写报道、写深度稿、写特稿、写专题、写调查报道、写长文、拆书改写、海外本地化改写、爆款结构改写、激活原料、原料盘点、整理素材"
description_zh: "福帮手出品 | 高质量长文档手稿工具链：书籍、手册、白皮书、行业指南、长篇报道、深度专题；支持联网查证（宿主允许时启用，离线自动降级）、S/P/C/B 分层审校、中文排版与 MD/HTML 交付。触发词：福帮手、福帮手写书skill、福帮手写书、写书、出书、写长篇、写手册、写白皮书、写行业指南、协作写书、定大纲、写章节、封面、插图、排版构建、导出、去AI味、质量自检、图文书、写报道、写深度稿、写特稿、写专题、写调查报道、写长文、拆书改写、海外本地化改写、爆款结构改写、激活原料、原料盘点、整理素材"
description_en: "Dual-channel long-form writing workflow for books, manuals, whitepapers, guides and reports with layered QC, 7-lock anti-drift anchors, and offline fallback."
allowed-tools:
  - bash
  - filesystem.read
  - filesystem.write
  - web_search
user-invocable: true
scene-packs: [general, genealogy, consultant, ghostwriter, training, personal-book, whitepaper, report]
ui-actions: true
---

# 福帮手 高质量长文档手稿工具链（FBS-BookWriter-LRZ）

> **版本**：2.1.2
> **通道**：OpenClaw 全量适配版
> **说明**：本技能基于 fbs-bookwriter-lrz v2.1.2 移植，OpenClaw 环境全量适配。WorkBuddy 依赖已做动态降级，非 WorkBuddy 宿主下静默跳过不报错。

---

## ⚡ 执行速查卡（AI 必读）

### 🔒 输出抑制强制规则（最高优先级，无豁免）

**所有 exec 调用脚本时，必须在命令结尾加 `> $null 2>&1`，禁止原始 stdout/stderr 进入对话流。**

Windows (PowerShell)：
```bash
node scripts/<script>.mjs ... > $null 2>&1
```

Linux/macOS：
```bash
node scripts/<script>.mjs ... > /dev/null 2>&1
```

**违规则：WebChat 渲染文件卡片 / 用户看到内部台账路径 / JSON 片段泄漏**

---

### ⚠️ 输出规范（最高优先级，违反即出错）

#### 🌐 强制中文输出（铁律，无豁免）

**所有面向用户的输出必须是纯中文，禁止出现任何英文。**

| ❌ 禁止 | ✅ 正确 |
|--------|--------|
| "Generating chapter 3..." | "正在生成第 3 章..." |
| "Error: ENOENT" | "错误：文件不存在" |
| "S3 Writing Phase" | "第三阶段：正式写稿" |
| "Progress: 50%" | "进度：50% |
| "Estimated time: 30 min" | "预计还需：30 分钟" |
| "Chapter completed" | "第 X 章已完成" |

**要求：**
- 错误提示 → 中文
- 进度信息 → 中文
- 技术术语 → 中文（或中文 + 括号英文）
- 阶段名称 → 中文
- 脚本输出 → 静默，不展示原始英文

**示例转换表：**

| 场景 | 英文原文 | 中文输出 |
|------|---------|---------|
| 章节开始 | "Writing chapter X..." | "正在写第 X 章..." |
| 章节完成 | "Chapter X done (2000 chars)" | "第 X 章完成（2000 字）" |
| 进度更新 | "Progress: 3/10 chapters" | "进度：已完成 3/10 章" |
| 时间预估 | "Estimated: 45 minutes remaining" | "预计还需：45 分钟" |
| 错误提示 | "File not found: chapters/xx.md" | "找不到文件：chapters/xx.md" |
| 阶段切换 | "Moving to S4: Quality Check" | "进入第四阶段：质量检查" |

---

**所有脚本执行后，不得将原始技术输出直接展示给用户。**

| 脚本 | 用户可见内容 |
|------|------------|
| `intake-router.mjs --json` | 只展示 `firstResponseContext.userFacingOneLiner`（一句话）+ `firstResponseContext.openingGuidance.primaryOptionsHint`（最多 3 个选项） |
| `init-fbs-multiagent-artifacts.mjs` | **静默执行**，不展示任何 stdout 内容 |
| `session-exit.mjs --json` | 只展示 `userMessage` 复述 + 退出摘要 |
| `quality-auditor-lite.mjs` | 只展示关键发现，不展示完整 JSON |
| 其他所有脚本 | 除非用户主动要求查看详情，一律静默 |

**举例**：intake-router.mjs 输出 500 行 JSON，AI 只提取 `userFacingOneLiner` 那句话发给用户，其余全部丢弃。

#### 用户可见文本规范（强制，违反即出错）

**绝对禁止在用户可见回复中出现以下内容：**
- AI 内部前缀：如"这是帮你整理的文档："、"帮你找到了："、"根据分析："、"正在处理..."
- 过程说明：如"我来帮你"、"让我先..."、"首先"、"接下来"、"执行中"等技术引导语
- 脚本原始输出：JSON 片段、命令行回显、文件路径、堆栈信息

**正确做法：**
| ❌ 错误示例 | ✅ 正确示例 |
|---|---|
| "这是帮你整理的文档：\n\n第一章..." | "第一章..." |
| "帮你查了一下运行状态，都正常：\n✅ 宿主能力 正常..." | "✅ 运行正常。可以继续了。" |
| "让我先执行脚本..." | （直接给结果，不说过程） |
| "根据刚才的分析，你的书稿..." | "你的书稿..." |

**核心原则**：只输出用户最终需要知道的结论或内容，不输出任何 AI 推理、处理、编排过程的中间语言。

### ⚡ 性能规范（降低回复延迟）

#### intake-router 调用时机

| 场景 | 是否调用 intake-router |
|---|---|
| 首次触发写作（"写书"、"写章节"等） | ✅ 调用 |
| 阶段/章节切换（S0→S1、S1→S2 等） | ✅ 调用 |
| 连续写作（同一阶段内的多轮对话） | ❌ 跳过，直接使用 session-resume.json 状态 |
| 用户仅查看进度、状态 | ❌ 跳过，不调用脚本 |
| S0 情报收集阶段（每轮都需更新摘要） | ✅ 调用 |

**判断逻辑**：若当前阶段未变、书稿目录未切换、用户意图明确为"继续写"，则跳过 intake-router，直接读取 `.fbs/session-resume.json` 的 `resumeCard` 字段推进。

#### 文件同步规则

| 操作 | 同步时机 |
|---|---|
| 修改 `E:\github\fbs-bookwriter-lrz\SKILL.md` 后 | 仅在用户确认或下次写作会话前同步到安装目录 |
| 修改脚本文件（.mjs/.js）后 | 仅在相关功能首次被触发前同步 |
| 其他素材文件（.md/.json） | 不同步安装目录，仅操作书稿根目录 |

**原则**：不在每次回复中执行 copy 操作。

---

### 第一步：意图菜单（强制，new）

**触发写书类操作时，先发意图选择卡片，用户点选后再进入对应流程。**

#### 触发条件

满足以下任一条件时，**跳过脚本，先发 poll 卡片**：
- 用户说：写书、出书、写长篇、写手册、写白皮书、写行业指南、开始写
- 无法从对话中确定具体意图（用户只说了"写东西"、"帮我写"）

#### 已存在书稿时

先检查 `.fbs/chapter-status.md` 是否存在：
- **存在** → 走"第二步：恢复优先"，直接问用户要继续写哪章
- **不存在** → 发意图选择卡片（见下）

#### 意图菜单卡片发送方式

```json
message(
  action="send",
  channel="webchat",
  pollQuestion="选择你要创作的作品类型",
  pollOption=["写长篇（书籍/小说）", "写手册（操作指南/说明书）", "写白皮书（行业报告）", "写行业指南", "写长篇报道"],
  pollDurationHours=24,
  target="<userId>"
)
```

#### 用户选完后

根据用户选择的选项，将 `--intent` 参数映射如下：

| 用户点击的选项 | --intent 值 |
|---|---|
| 写长篇（书籍/小说） | `novel` |
| 写手册（操作指南/说明书） | `manual` |
| 写白皮书（行业报告） | `whitepaper` |
| 写行业指南 | `industry-guide` |
| 写长篇报道 | `long-report` |
| （用户自定义输入） | `auto`（走 auto 路由） |

#### 常见误区

- ❌ 不确定意图时直接写代码 → ✅ 先发卡片
- ❌ 发卡片后不等待用户回复就继续 → ✅ 等用户投票后再继续

---

### 第二步：开场路由（强制）

**意图确定后执行（必须静默，后台执行，结果写入 JSON 文件再读取）：**

```bash
# 静默执行，输出写入结果文件
node scripts/intake-router.mjs --book-root <bookRoot> --intent <mappedIntent> --json --enforce-required > $null 2>&1
```

执行后读取 `.fbs/intake-router.last.json`，从 `firstResponseContext.userFacingOneLiner` 和 `firstResponseContext.openingGuidance.primaryOptionsHint` 提取用户可见内容。

- `--book-root` 需使用书稿根目录的**绝对路径**
- `--intent` 必须与用户选择的意图对应（见上表）
- 脚本会自动检测宿主能力、降级到 `node-cli` 模式（在 OpenClaw 下属正常行为）
- OpenClaw 下建议将 JSON 结果写入 `.fbs/intake-router.last.json` 便于调试

### 第三步：恢复优先（按此顺序）

```
1. IF exists(.fbs/session-resume.json)  → 读取恢复卡 → 恢复会话
2. ELSE IF exists(.fbs/chapter-status.md) → 读取章节台账 → 补写恢复卡后恢复
3. ELSE                                     → 进入 S0 初始化
```

**注意**：OpenClaw 下不提供 WorkBuddy 宿主记忆 API，完全依赖 `.fbs/` 文件系统保存状态。

### 第三步：S0 初始化（无项目时）

⚠️ **全新任务开始前必须询问工作目录（P0 强制）**

**全新任务定义**：用户首次提出写作需求、创建新书稿。

**询问内容（必须）**：
```
📁 新书稿存放位置

请选择书稿存放位置：
1. 在当前目录新建书籍文件夹（如：./我的新书/）
2. 指定其他路径（如：E:/books/我的新书/）
3. 使用现有书稿目录

请输入序号或直接指定路径：
```

**禁止行为**：
```
❌ 直接在当前目录创建文件（未询问用户）
❌ 不确认目录就创建 .fbs/ 等隐藏文件
❌ 用户说"写一本书"就直接在当前工作区创建
```

**正确流程**：
1. 用户首次提出写作需求
2. ✅ **先询问**：在哪个目录创建/工作？
3. ✅ **确认目录**后，再执行 `init-fbs-multiagent-artifacts.mjs`
4. ✅ 告知用户创建了哪些目录

**静默初始化（禁止在对话中展示任何 write: 日志）：**

```bash
node scripts/init-fbs-multiagent-artifacts.mjs --book-root <bookRoot> > $null 2>&1
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
| 首次进入 / 新建项目 | `node scripts/init-fbs-multiagent-artifacts.mjs --book-root <bookRoot> > $null 2>&1` |
| 继续写 / 接着写 | 读 `.fbs/session-resume.json` → 从上次位置继续 |
| 质量自检 / 去 AI 味 | `node scripts/quality-auditor-lite.mjs --book-root <bookRoot> > $null 2>&1` |
| 退出 / 停止 | `node scripts/session-exit.mjs --book-root <bookRoot> --json > $null 2>&1` |
| 环境预检 | `node scripts/env-preflight.mjs --json > $null 2>&1` |
| S0 素材达标检测 | `node scripts/s0-exit-gate.mjs --book-root <bookRoot> --json > $null 2>&1` |
| 大纲生成完成（S1 后）| `node scripts/update-project-scale.mjs --book-root <bookRoot> > $null 2>&1` |
| 合并全稿 | `node scripts/merge-chapters.mjs --book-root <bookRoot> > $null 2>&1` |

---

## 📊 规模分级与策略（AI 必读）

> 用户提出写作目标时，必须先判断规模档位，再执行对应策略。
> 本档位与 `references/05-ops/scale-tiers.json` 一致。

### 档位速查（按用户目标字数）

| 用户说… | 约数字数 | 档位 | 策略 |
|-----------|------------|------|------|
| 「写一本小册子/短篇」 | ≈ 3 万字 | **S** | 单会话可完成，全量精检 |
| 「写一本书/手册」 | ≈ 10 万字 | **M** | 分批生成，Panorama→Deep 质检 |
| 「写一部长篇/全集」 | 几十万字 | **L** | 分批+抽样质检 |
| 「写百万字巨著/丛书」 | 百万字以上 | **XL** | 分卷，分目录批次执行 |

### 档位判定规则

```
取「字数档位」与「章数档位」的较高者：

按字数：  ≤3万→S    ≤10万→M    ≤100万→L    ＞100万→XL
按章数：  ≤10章→S   ≤50章→M   ≤150章→L   ＞150章→XL
```

### 各档位执行策略

```
S 档（≈3万字）：
  - Auto-Run：不分批，一次性完成
  - 质检：全量精检（每章逐字检查）
  - 预计耗时：约 1-2 小时

M 档（≈10万字）：
  - Auto-Run：每 2 章自动暂停，等待用户确认继续
  - 质检：先 Panorama 全景扫描，再对问题章节 Deep 精检
  - 分卷：不启用
  - 预计耗时：约 5-15 小时（分批）

L 档（几十万字）：
  - Auto-Run：每 2 章自动暂停
  - 质检：Panorama 全景 + 随机抽取 20% 章节精检
  - 分卷：10万字以上自动启用，每卷约 15-30 万字
  - 预计耗时：数十小时（分批+分卷）

XL 档（百万字以上）：
  - Auto-Run：每卷完成后暂停
  - 质检：每卷独立质检，卷间交叉抽样验证
  - 分卷：强制启用，每卷约 30 万字
  - 预计耗时：数百小时（分卷+分批）
```

### 用户意图 → 档位映射示例

| 用户原话 | 识别档位 | 执行动作 |
|-----------|------------|----------|
| 「帮我写一本关于AI的30页小册子」 | S | 直接执行，无需分批 |
| 「写一本10万字的Python入门书」 | M | 启用 Auto-Run，每2章暂停 |
| 「写一套50万字的商业管理全集，共8卷」 | L/XL | 启用分卷模式，先规划卷结构 |
| 「写一本200万字的网络小说」 | XL | 强制分卷，建议用户确认卷结构 |

---

## S0–S6 工作流概述

### S0：素材整理

收集主题、目标读者、核心主张、术语表、案例素材。

**达标条件**：`author-meta.md` 已填写 + 素材数 ≥ 赛道数 × 2。

### S1 / S2：大纲规划

确认目标读者画像 → 制定章节目录 → 案例库建立。

**达标条件**：大纲已确认 + `story-bank.md` ≥ 3 条案例。

**✅ S1 大纲生成完成后，必须立即调用（AI 自动执行，无需用户确认）：**
```
node scripts/update-project-scale.mjs --book-root <bookRoot> > $null 2>&1
```
> 目的：自动估算章节数和字数，回写 `project-config.json`，
> 解析并保存档位策略到 `.fbs/writing-strategy.json`，
> 确保 S3 写稿时档位策略正确生效。

### S3：正式写稿（串行约束 + 实时进度）

⚠️ **禁止一次性读取全部章节（会导致会话卡死）**

**扩写时，禁止一次性读取全部章节！**

正确做法：
- ✅ 只读取当前正在扩写的 1-2 章
- ✅ 读完立即扩写，不要等全部读完
- ✅ 分批处理：写完第 1-2 章 → 再读第 3-4 章 → 再写
- ❌ **禁止**：先读完全部 N 章，再开始扩写

**原因**：一次性读取全部章节会触发过多工具调用（N 个 Read 调用），导致 WorkBuddy 平台步骤限制，会话直接卡死结束。

参考 `workflow-s3-core.md` 的 Auto-Run 分批策略：每 2 章自动暂停。读取章节也应遵循同样的分批原则。

#### ⚠️ 单轮工具调用限制（P0 强制，防止步骤爆炸）

**单轮对话最多调用 2 个工具。完成 1 个，等待结果，再调下 1 个。**

错误模式（禁止）：
```
❌ 错误：一次性调用 8 个 Read 读取全部 8 章
❌ 错误：一次性调用 5 个 Edit 修改多个文件
❌ 错误：一次性调用 3 个 Bash 执行多个脚本
```

正确模式（必须）：
```
✅ 正确：第 1 轮 → Read 读取第 1 章
✅ 正确：第 2 轮 → Read 读取第 2 章
✅ 正确：第 3 轮 → Write/Edit 扩写第 1 章
✅ 正确：第 4 轮 → Write/Edit 扩写第 2 章
```

**强制规则**：
1. 单轮对话 ≤ 2 个工具调用（Read/Write/Edit/Bash 都算）
2. 读取章节：每次最多读 1-2 章，读完立即扩写，不要等全部读完
3. 修改文件：每次最多改 1-2 个文件，改完 1 个再改下 1 个
4. 执行脚本：每次最多执行 1-2 个，执行完等待结果
5. **禁止**说"先读取全部章节，了解内容后再扩写"——这是错误策略

**原因**：WorkBuddy 平台有步骤限制，单轮调用 N 个工具 = N 个步骤，超过限制会话直接卡死结束。

---

每轮最多修改 **2 个文件**，完成 1 个再推进下 1 个。

#### 📊 实时进度显示（仅长任务启用）

**进度条仅在预估耗时 >2 分钟时显示**，短任务直接执行不显示进度。

#### 🕐 S3 写稿前的总时间预估（强制执行）

进入 S3 正式写稿之前，必须先估算并告知用户全书预计耗时。

**当书稿满足以下任一条件时，写稿前必须展示时间预估：**
- 全书预估字数 ≥ 3 万字
- 全书预估章节数 ≥ 10 章
- 用户说"大项目"、"长篇"、"很长的书"

**预估格式（中文）：**

```
📖 书名：{书名}
⏱️ 预估总用时：约 {N} 分钟（{M} 章 × 平均 {X} 分钟/章）
📊 当前进度：{已完成章数}/{总章数} 章
⏳ 预计剩余：约 {R} 分钟

开始写稿？[确认/取消]
```

**预估算法（已根据实测校准）：**

```
全书预估时间（分钟）= 预估总字数 / 1000 × 0.5
单章平均耗时（分钟）= 已完成章节的平均耗时（首次按 0.5 分钟估算，后续按实际更新）
剩余时间（分钟）= 剩余章节数 × 单章平均耗时
```

**实测数据**：
- 4万字书稿实测约15分钟完成
- 每千字约0.4-0.5分钟（含AI生成+保存）
- 每章约1-2分钟（含读取+写入）

⚠️ **旧公式 `字数/1000×2` 已废弃**（会导致80分钟估算偏大为实际5倍）

**Part（卷）预估格式（适用于分卷书稿）：**

```
📖 书名：{书名}
📦 第 1 部分（Part 1）：{第1部分章数} 章，≈ {估算时间} 分钟
📦 第 2 部分（Part 2）：{第2部分章数} 章，≈ {估算时间} 分钟
⏱️ 预估总用时：约 {总时间} 分钟

开始写第 2 部分第 5 章？[确认/取消]
```

**示例对话（已校准）：**

```
AI：第 1 部分已完成，第 2 部分共 15 章，已完成 4 章。
⏱️ 第 2 部分预估总用时：约 7.5 分钟（15 章 × 平均 0.5 分钟/章）
⏳ 预计剩余：约 5.5 分钟
开始写第 5 章？[确认/取消]
```

#### ✍️ 执行多章节写作任务时，必须在每完成 1 章后输出进度条：

```text
第 1/10 章完成 ██░░░░░░░░░░░░░░░░  10%  预计还需：4.5 分钟
第 2/10 章完成 ████░░░░░░░░░░░░░  20%  预计还需：4 分钟
第 3/10 章完成 ██████░░░░░░░░░░░  30%  预计还需：3.5 分钟
...
```

**进度条规则：**
- 每完成 1 章立即输出 1 行进度
- 显示格式：`[已完成]/[总章数] 章完成 ████░░░░░░░░░░░░░░  XX%  预计还需：X 分钟`
- 使用 ASCII 方块字符：`█`（已完成）+ `░`（未完成）
- 进度条长度：20 个字符
- 剩余时间根据已完成章节的平均耗时动态估算
- 耗时 <2 分钟的脚本：**不显示进度条**，直接静默执行

**时间估算算法：**
```
已完成耗时 = (当前时间 - 开始时间)
单章平均耗时 = 已完成耗时 / 已完成章节数
剩余章节数 = 总章节数 - 已完成章节数
预计剩余时间 = 单章平均耗时 × 剩余章节数
```

**示例（10 章书稿，每章约 0.5 分钟）：**

```text
开始：第 1/10 章 ░░░░░░░░░░░░░░░░░░░   0%  开始写稿
第 1 章完成  ██░░░░░░░░░░░░░░░░░  10%  预计还需：4.5 分钟
第 2 章完成  ████░░░░░░░░░░░░░░░  20%  预计还需：4 分钟
...
第 5 章完成  ██████████░░░░░░░░░░  50%  预计还需：2.5 分钟
...
第 10 章完成 ████████████████████ 100%  已全部完成！
```

**禁止**：
- 同一章节并行写多段
- 跳过 `s3-start-gate` 门禁
- 无备份大段删改
- 写完所有章节后才输出进度（必须实时）

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
node scripts/session-exit.mjs --book-root <bookRoot> --json > $null 2>&1
```

脚本将写入：
- `.fbs/session-resume.json`
- `.fbs/smart-memory/session-resume-brief.md`

---

## 工具调用规范

### 执行脚本（使用 `exec`）

**必须静默执行，禁止让 stdout 进入对话流。**

```bash
# 标准模板（Windows PowerShell）
node scripts/<script-name>.mjs --book-root <bookRoot> [--options] > $null 2>&1

# 执行后读取结果文件提取需要的内容
read .fbs/intake-router.last.json   # 从 JSON 读 userFacingOneLiner
read .fbs/session-resume.json       # 读恢复卡
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

⚠️ **强制规则：必须使用预设脚本，禁止自己写导出脚本**

**错误做法（禁止）**：
```
❌ 自己写合并脚本
❌ 自己写导出脚本
❌ 自己安装依赖包然后写代码
```

**正确做法（必须）**：
```
✅ 直接调用：node scripts/export-to-docx.mjs --book-root <书稿根目录>
✅ 直接调用：node scripts/export-to-pdf.mjs --book-root <书稿根目录>
✅ 直接调用：node scripts/merge-chapters.mjs --book-root <书稿根目录>
```

**支持格式：**

| 格式 | 命令 | 依赖 |
|------|------|------|
| Markdown | 直接使用 | 无 |
| HTML | `renderMarkdownPreview()` | `markdown-it` |
| DOCX | `node scripts/export-to-docx.mjs <合并文件.md> <输出.docx>` | `docx` |
| PDF | `node scripts/export-to-pdf.mjs <合并文件.md> <输出.pdf>` | `puppeteer` |

**典型工作流：**
```bash
# 1. 先合并章节
node scripts/merge-chapters.mjs --book-root <书稿根目录>

# 2. 导出 DOCX（使用合并后的文件）
node scripts/export-to-docx.mjs output/merged-book.md 书籍名.docx --title "书名" --author "作者"

# 3. 交付导出
node scripts/deliver-export.mjs 书籍名.docx
```

**⚠️ 注意**：导出前必须先合并章节，禁止直接导出单章文件。

**安装可选依赖：**
```bash
npm install html-to-docx docx puppeteer
```

**静默执行交付脚本（禁止展示原始输出）：**
```bash
node scripts/deliver-export.mjs <导出文件路径> > $null 2>&1
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
