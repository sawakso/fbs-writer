---
name: fbs-bookwriter-lrz
version: 2.2.0
plugin-id: fbs-bookwriter-lrz-v212
description: "福帮手出品 | 高质量长文档手稿工具链：书籍、手册、白皮书、行业指南、长篇报道、深度专题；支持联网查证（宿主允许时启用，离线自动降级）、S/P/C/B 分层审校、中文排版与 MD/HTML 交付。触发词：福帮手、福帮手写书skill、福帮手写书、写书、出书、写长篇、写网络小说、写网文、番茄小说格式、起点中文网、晋江文学城、网文平台、写手册、写白皮书、写行业指南、协作写书、定大纲、写章节、封面、插图、排版构建、导出、去AI味、降重改写、质量自检、图文书、写报道、写深度稿、写特稿、写专题、写调查报道、写长文、拆书改写、海外本地化改写、爆款结构改写、激活原料、原料盘点、整理素材、续写、继续写、接着写、补写、扩写"
description_zh: "福帮手出品 | 高质量长文档手稿工具链：书籍、手册、白皮书、行业指南、长篇报道、深度专题；支持联网查证（宿主允许时启用，离线自动降级）、S/P/C/B 分层审校、中文排版与 MD/HTML 交付。触发词：福帮手、福帮手写书skill、福帮手写书、写书、出书、写长篇、写网络小说、写网文、番茄小说格式、起点中文网、晋江文学城、网文平台、写手册、写白皮书、写行业指南、协作写书、定大纲、写章节、封面、插图、排版构建、导出、去AI味、降重改写、质量自检、图文书、写报道、写深度稿、写特稿、写专题、写调查报道、写长文、拆书改写、海外本地化改写、爆款结构改写、激活原料、原料盘点、整理素材、续写、继续写、接着写、补写、扩写"
description_en: "Dual-channel long-form writing workflow for books, manuals, whitepapers, guides and reports with layered QC, 7-lock anti-drift anchors, and offline fallback."
allowed-tools:
  - bash
  - filesystem.read
  - filesystem.write
  - web_search
user-invocable: true
scene-packs: [general, genealogy, consultant, ghostwriter, training, personal-book, whitepaper, report, webnovel]
ui-actions: true
---

# 福帮手 高质量长文档手稿工具链（FBS-BookWriter-LRZ）

> **版本**：2.1.2
> **通道**：OpenClaw 全量适配版
> **说明**：本技能基于 fbs-bookwriter-lrz v2.1.2 移植，OpenClaw 环境全量适配。WorkBuddy 依赖已做动态降级，非 WorkBuddy 宿主下静默跳过不报错。

🚨 **头号铁律（P0 强制，违反即出错）**

**所有面向用户的输出必须是纯中文，禁止任何英文单词或短语。**

```
❌ 禁止：Good, found the scripts. Let me...
❌ 禁止：Writing chapter 3...
❌ 禁止：Error: ENOENT
❌ 禁止：Progress: 50%
❌ 禁止：Estimated time: 30 min

✅ 正确：已找到脚本，正在更新状态...
✅ 正确：正在写第 3 章...
✅ 正确：错误：文件不存在
✅ 正确：进度：50%
✅ 正确：预计还需：30 分钟
```

**无豁免。违反即出错。**

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

#### OS 自动检测（P1 强制，会话最开头执行一次）

每次会话开始（首次执行脚本前），静默跑一次 OS 检测，把结果记在会话状态里，之后全会话沿用。

```bash
# 检测操作系统类型，写入隐蔽文件供后续读取
node -e "
const fs = require('fs');
const os = process.platform;
const shell = os === 'win32' ? 'powershell' : 'bash';
fs.writeFileSync('.fbs/.os-detect.json', JSON.stringify({\n  platform: os,\\
  shell: shell,\\
  nullRedirect: os === 'win32' ? '$null 2>&1' : '/dev/null 2>&1',\
  pathSep: os === 'win32' ? '\\\\' : '/',\
  isWindows: os === 'win32'\
}));\n" > /dev/null 2>&1
```

之后全会话用 `.fbs/.os-detect.json` 的 `nullRedirect` 值，不再每次判断。

**速查**：

| 平台 | `nullRedirect` 值 | `pathSep` |
|------|-------------------|-----------|
| Windows | `$null 2>&1` | `\\` |
| Linux | `/dev/null 2>&1` | `/` |
| macOS | `/dev/null 2>&1` | `/` |

**简单规则**：如果忘记跑检测或无法确定，默认按 Linux/macOS 格式写（`> /dev/null 2>&1`），Windows 用户会看到报错提醒换格式。

**违规则：WebChat 渲染文件卡片 / 用户看到内部台账路径 / JSON 片段泄漏**

---


**所有脚本、工具调用、中间步骤一律静默执行，禁止向用户展示任何过程信息。**

⚠️ **qclaw 平台文件弹出过滤规则（P0 强制）**

**问题**：qclaw 平台对 `filesystem.read` 和脚本输出的文件路径会自动弹出文件卡片（JSON/MD 预览）。


### 禁止弹出的文件（内部文件，P0 强制）

以下文件在任何场景下均**禁止直接** `filesystem.read`。必须走脚本管道读取，且脚本输出必须重定向到 `$null`：

| 禁止直接读 | 原因 | 替代方案 |
|-----------|------|--------|
| `.fbs/*.json` | 内部台账、路由结果、快照、预设选择、OS 检测 | `node scripts/intake-router.mjs --json --book-root <路径> > $null 2>&1` → 读 `.fbs/intake-router.last.json`，只展示 `userFacingOneLiner` |
| `.fbs/*.md` | 章节状态、恢复摘要 | 同上，只展示一句话恢复摘要，不贴原文 |
| `project-config.json` | 项目规模/档位配置 | 提取档位信息后用自然语言汇报（"这本书约 10 万字，M 档"），不暴露 JSON 结构 |
| `author-meta.md` | 作者元数据 | 只用其信息，不弹文件 |
| `scenes-packs/*` | 场景包配置 | 供脚本内部消费，不直接读 |
| `scripts/*.mjs` | 脚本文件 | 不读，直接 exec 执行 |
| `references/**` | 内部参考文档 | 不读，AI 从知识提取 |

**例外**：排错时用户明确要求“看这个文件的内容”，可以读。但需先告知用户"会看到内部文件内容"。


### 允许弹出的文件（用户可见，弹出正常）

读这些文件时可以用 `filesystem.read`，弹文件卡片是预期行为：

| 允许直接读 | 说明 |
|-----------|------|
| `chapters/*.md` | 书稿正文，用户需要看写好的内容 |
| ` deliverables/*` | 交付物（如需查看） |
| 大纲文件 | 用户确认大纲时 |


### 脚本执行规则（沿用）

```
✅ 正确写法（隐藏输出，不触发弹出）
node scripts/xxx.mjs --book-root <路径> > $null 2>&1

❌ 错误写法（暴露路径触发文件卡片弹出）
node scripts/xxx.mjs --book-root <路径>
```

**核心原则**：所有脚本执行时必须重定向输出到 `$null`，不暴露文件路径。

### ⛔ P0 铁律：禁止自写导出/合并脚本

**任何导出格式转换（Markdown→DOCX/PDF/HTML）以及章节合并，必须使用 SKILL 内置脚本（`scripts/export-to-docx.mjs`、`scripts/export-to-pdf.mjs`、`scripts/merge-chapters.mjs`）。
禁止用 `exec` 跑 python3/sed 做格式转换，禁止自己写转换代码，禁止用 `filesystem.write` 组装 DOCX/PDF 二进制。**

违规处理：直接报错，说明"请使用 SKILL 内置导出脚本"。


### 用户可见内容速查

| 场景 | 用户看到的内容 |
|------|--------------|
| 恢复中断的书稿 | "当前书稿：《渡》，已写 35/60 章（✅ 达标），上次写到 Ch36" — 不贴 JSON 不弹卡片 |
| 读取章节内容 | 书稿正文（允许弹卡片） |
| 执行质检 | "✅ 质检通过。3 处措辞建议，详见章末。" — 一句话 |
| 执行恢复路由 | "这里有 4 本书稿，你想继续写哪一本？" — 一句话引导，不弹路由 JSON |
| 查看内部文件 | （用户明确要求时才做）"这是 .fbs/session-resume.json 的内容：..." |

**关键原则**：内容分内外两层。对外层（书稿正文、大纲、交付物），允许文件卡片弹出。对内层（`.fbs/`、`project-config.json`、脚本、配置），**绝不允许弹出**。

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

### 新用户激活 SOP（P0 强制，首次进入必走）

#### 触发条件

首次触发写作（无 `.fbs/`、无 `fbs-user-profile/`、无 session-resume.json），自动进入本流程。
判断标准：检查以下文件是否存在，全部不存在则为新用户：
- `~/.openclaw/fbs-user-profile/user-profile.json`
- 任何书稿目录下的 `.fbs/session-resume.json`

#### 分步 SOP

##### Step 1 — 欢迎与能力介绍（一句话）

```
📖 福帮手写作工具就绪
```

不展开说明，直接进入 Step 2。

##### Step 2 — 首次使用引导（必发，不含糊）

**直接向用户说明：**

```
第一次使用，我们先确认几个基础信息，就能开始写书了。

📁 书稿放在哪个目录？
（如：./新书、E:/books/我的书、/root/books/项目名）
```

**等待用户输入目录路径。AI 禁止自作主张选目录。**

##### Step 3 — 目录确认与初始化

用户提供目录后：

```bash
# 创建目录（如不存在）
mkdir -p "<用户提供的目录>" > /dev/null 2>&1

# 项目初始化（静默执行）
node scripts/init-fbs-multiagent-artifacts.mjs --book-root "<路径>" > /dev/null 2>&1
```

回复用户：

```
✅ 书稿目录已就绪

接下来做什么？
1. 告诉我你想写什么书（我会帮你规划）
2. 你有素材给我，我帮你整理
3. 我只是先看看
```

##### Step 4 — 激活下一阶段

用户选择后，按意图进入对应流程：

| 用户选择 | 下一阶段 |
|---------|---------|
| 1. 告诉我想写什么 | → S0 情报收集（素材引导） |
| 2. 我有素材 | → 直接收素材，走 S0 整理 |
| 3. 先看看 | → 结束，等待下次触发 |

AI 跳转到对应的标准流程阶段。

#### 新用户 SOP 禁止行为（P0）

```
❌ 不问目录直接创建文件（违反工作目录询问规则）
❌ 一次性发送大量信息（功能列表、操作手册等）——新用户会不知所措
❌ 跳过 Step 2 直接问「想写什么书」——先确认目录
❌ 在 Step 2 问完目录后不等回复就开始写文件
❌ 展示脚本输出、文件路径、JSON 等内部细节
```

#### 新用户 SOP 适配说明

- **本 SOP 适用于所有场景包（general/genealogy/consultant/ghostwriter/training/personal-book/whitepaper/report/webnovel）**，不同场景包在 Step 4 的引导措辞可微调
- 已存在书稿的用户（有 `.fbs/`）不触发本流程，走「恢复优先」
- **注意**：已存在项目但未配置用户画像 `fbs-user-profile/` 的用户，不是新用户，不走本流程。下次使用或首次导出时再引导配置

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

#### 预设选择（P1，写书/写小说/定大纲必走）

**意图确定后、开场路由前，按以下逻辑触发预设选择。**

##### 触发条件

| 用户说了 | 触发预设选择 |
|---------|-------------|
| 写书 → 选「写长篇（书籍/小说）」 | ✅ 必走 |
| 直接说「写网络小说/写网文/番茄/起点/晋江」 | ✅ 必走（无需意图菜单，直接进入预设选择） |
| 直接说「定大纲」且无现有书稿 | ✅ 必走，先选类型 + 预设
| 直接说「定大纲」且有现有书稿 | ❌ 跳过，直接问「为哪本书定大纲？」 |
| 写书 → 选非小说类型（手册/白皮书等） | ❌ 跳过，走对应场景包默认规范 |

##### 预设选项卡片

**当 intent = novel 或用户明确说网文/小说时：**

```json
message(
  action="send",
  channel="webchat",
  pollQuestion="选择写作预设",
  pollOption=["通用小说（不限平台）", "番茄小说", "起点中文网", "晋江文学城"],
  pollDurationHours=24,
  target="<userId>"
)
```

##### 预设 → 场景包映射

| 用户选择 | 激活场景包 | 行为 |
|---------|-----------|------|
| 通用小说（不限平台） | `general` + 小说体裁 | 通用写作规范 |
| 番茄小说 | `webnovel` + 番茄模式 | 2000-3000字/章、直白风格、每章钩子 |
| 起点中文网 | `webnovel` + 起点模式 | 2000-4000字/章、首章≥3000字、付费节奏 |
| 晋江文学城 | `webnovel` + 晋江模式 | 3000-5000字/章、直角引号、情感细腻 |

**预设信息写入 `.fbs/active-preset.json`，供后续 S3 写稿和导出阶段读取。**

```bash
node -e "
const fs = require('fs');
fs.writeFileSync('.fbs/active-preset.json', JSON.stringify({
  scenePack: '<场景包>',
  platform: '<平台名>',
  platformMode: '<平台模式>',
  selectedAt: new Date().toISOString()
}));
" > /dev/null 2>&1
```

##### 定大纲场景的预设选择

用户说「定大纲」且无现有书稿时，先走意图菜单确定类型，再走预设选择。

流程：
```
用户：「定大纲」
  ↓
有现有书稿吗？
  ├─ 有 → 「这里有 N 本书，为哪本定大纲？」→ 加载该书稿的预设
  └─ 无 → 走意图菜单（选类型）→ 如为小说 → 走预设选择 → 生成大纲
```

##### 预设记录格式

```json
// .fbs/active-preset.json
{
  "scenePack": "webnovel",
  "platform": "番茄小说",
  "platformMode": "fanqie",
  "selectedAt": "2026-05-04T03:23:00.000Z"
}
```

##### 常见误区

- ❌ 用户说「写小说」直接开始写，不问平台预设
- ❌ 用户说「定大纲」跳过类型确认直接生成
- ❌ 预设选择结果不用，后续 S3 写稿还是按通用规范
- ❌ 多个书稿项目时，「定大纲」不先确认是哪本书

---

### 第二步：开场路由（强制）

```bash
# 静默执行，输出写入结果文件
node scripts/intake-router.mjs --book-root <bookRoot> --intent <mappedIntent> --json --enforce-required > $null 2>&1
```

执行后读取 `.fbs/intake-router.last.json`，从 `firstResponseContext.userFacingOneLiner` 和 `firstResponseContext.openingGuidance.primaryOptionsHint` 提取用户可见内容。

- `--book-root` 需使用书稿根目录的**绝对路径**
- `--intent` 必须与用户选择的意图对应（见上表）
- 脚本会自动检测宿主能力、降级到 `node-cli` 模式（在 OpenClaw 下属正常行为）
- OpenClaw 下建议将 JSON 结果写入 `.fbs/intake-router.last.json` 便于调试

### 第三步：恢复优先（跨会话，按此顺序）

#### 0. 全局注册表优先查询（P1 强制，跨会话恢复前提）

**新会话首次触发时，先查全局注册表，再走文件级恢复。**

```bash
# 读取全局注册表，静默写入结果文件
node scripts/read-project-registry.mjs --json > /dev/null 2>&1
```

读取 `~/.workbuddy/fbs-book-projects.json` 的 `entries` 字段。

**分支逻辑：**

```
1. 有已注册项目（entries.length > 0）→ 列出项目让用户选择
   展示格式：
     找到 {N} 个书稿项目：
      1. 《渡》— /root/books/渡/ — S3 · 60/60 章 ✅
      2. 《Python入门》— /root/books/python/ — S2 · 大纲就绪
     继续写哪一本？

2. 无已注册项目 → 进入文件级恢复（下方 1/2/3 顺序）
```

**用户选择后：**
- 记录所选 `bookRoot` 为当前书稿路径
- 然后进入文件级恢复

**禁止行为：**
- ❌ 全局注册表有项目但跳过，直接问目录
- ❌ 输出 JSON 原文或进程信息
- ❌ 自动选一个项目不询问用户

#### 文件级恢复（1/2/3）

```
1. IF exists(.fbs/session-resume.json)  → 读取恢复卡 → 恢复会话
2. ELSE IF exists(.fbs/chapter-status.md) → 读取章节台账 → 补写恢复卡后恢复
3. ELSE                                     → 进入 S0 初始化
```

**注意**：OpenClaw 下不提供 WorkBuddy 宿主记忆 API，完全依赖 `.fbs/` 文件系统 + 全局注册表保存状态。

#### 📋 项目扫描规则（P0 强制，防漏扫）

**当用户问「有什么项目」「检查 X 目录」或需要列出现有书稿时，必须：**

1. **优先走全局注册表（替代 intake-router 扫描）**
   ```bash
   node scripts/read-project-registry.mjs --json > /dev/null 2>&1
   ```
   读取 `~/.workbuddy/fbs-book-projects.json` 的 `entries` 字段。

2. 如果注册表为空或用户指定了特定目录，再走 intake-router 扫描：
   ```bash
   node scripts/intake-router.mjs --book-root <目录路径> --intent auto --json --enforce-required > $null 2>&1
   ```
   然后从 `.fbs/intake-router.last.json` 的 `candidates` 字段读取。

3. **如果 intake-router 返回 0 个项目，才退回到手动确认目录结构**
   - 用 `filesystem.read` 列出指定目录下的**所有子目录**（包括深层嵌套的）
   - 不要只看顶层，有些项目可能嵌套在 `D:/book/新书稿-20260503-105337/` 这样的子目录中
   - 对每个子目录检查 `has .fbs/` 标记

4. **用户说「再看看」「没了吗」时，必须重扫**
   - 不要坚持第一次的结果
   - 直接问「要扩大扫描范围吗？比如深入到子目录？」

5. **列出项目时按自然语言描述，禁止弹 JSON**
   - ❌ "这里有 3 个 candidate，见 JSON"
   - ✅ "D:\book 下找到 3 个项目：
        1. 南极主题书稿（5 章）
        2. 新书稿-20260503-105337（白皮书，12 章规划，1 章已完成）
        3. ..."

#### 🔄 跨会话自动保存时机（P1 强制）

自动在以下时机写入全局注册表（静默执行，不通知用户）：

| 时机 | 触发方式 | 说明 |
|------|---------|------|
| 会话退出 | `session-exit.mjs`（已有） | 退出时自动注册，沿用现有机制 |
| 写完每 5 章 | 完成后检查脚本后补充注册 | 大纲更新时刷新进度 |
| 大纲生成完成 | `update-project-scale.mjs` 后补充注册 | 大纲更新时刷新进度 |

**写入命令（AI 在以上时机自动执行，不需要用户确认）：**

```bash
# 读当前状态写入全局注册表
node scripts/read-project-registry.mjs --json > /dev/null 2>&1
node -e "
const { registerBookProject } = require('./scripts/lib/fbs-book-projects-registry.mjs');
registerBookProject({ bookRoot: '<bookRoot>', bookTitle: '<书名>', currentStage: '<当前阶段>' });
" > /dev/null 2>&1
```

**写入时机汇总：**
- ✅ 退出时（已有）
- ✅ 完成第 5、10、15…章时
- ✅ S1 大纲生成完成时
- ❌ 每次写完单章不写（防滥用）

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

**项目初始化后立即注册到全局注册表（P1 强制，静默执行）：**

```bash
node -e "
const { registerBookProject } = require('./scripts/lib/fbs-book-projects-registry.mjs');
registerBookProject({ bookRoot: '<bookRoot>', currentStage: 'S0' });
" > /dev/null 2>&1
```

> 目的：确保新项目出现在全局注册表中，下次会话可直接恢复。

---

## 意图 → 脚本 速查表（MVP 精简版）

| 用户说了什么 | 立即执行 |
|------------|---------|
| 首次进入 / 新建项目 | `node scripts/init-fbs-multiagent-artifacts.mjs --book-root <bookRoot> > $null 2>&1` |
| 继续写 / 接着写 | 先读全局注册表（`read-project-registry.mjs`）→ 用户选项目 → 读 `.fbs/session-resume.json` 恢复 |
| 质量自检 / 去 AI 味 | `node scripts/quality-auditor-lite.mjs --book-root <bookRoot> > $null 2>&1` |
| 退出 / 停止 | `node scripts/session-exit.mjs --book-root <bookRoot> --json > $null 2>&1`（自动注册到全局表） |
| 环境预检 | `node scripts/env-preflight.mjs --json > $null 2>&1` |
| S0 素材达标检测 | `node scripts/s0-exit-gate.mjs --book-root <bookRoot> --json > $null 2>&1` |
| 大纲生成完成（S1 后）| `node scripts/update-project-scale.mjs --book-root <bookRoot> > $null 2>&1`（完成后注册到全局表） |
| 合并全稿 | `node scripts/merge-chapters.mjs --book-root <bookRoot> --output 全稿.md > $null 2>&1` |
| 清理过程标注 | `node scripts/strip-manuscript-annotations.mjs --input 全稿.md --output 交付稿.md --toc > $null 2>&1` |
| 列出所有项目 | `node scripts/read-project-registry.mjs --json > /dev/null 2>&1` |
| 搜索项目 | `node scripts/read-project-registry.mjs --search <关键词> --json > /dev/null 2>&1` |
| 查看最近项目 | `node scripts/read-project-registry.mjs --latest --json > /dev/null 2>&1` |
| 降重改写 / 降重 | 按 SKILL ⚙ 降重改写预设流程执行：句式变换 → 同义词 → 语序 → 段落重组 → 自查 |
| 网文创作 / 番茄/起点/晋江 | 激活 webnovel 场景包（自动检测平台），按场景包规范执行 |
| 定大纲 | 有项目→问「为哪本书定大纲？」；无项目→走意图菜单→预设选择→生成大纲 |
| 写小说 / 写书 | 现有意图菜单 → 选「写长篇」→ 走预设选择（通用/番茄/起点/晋江） |

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

### ⚠️ 单章字数硬约束（P0 强制，AI 必须遵守）

**每章正文（仅含中文汉字）必须满足以下字数下限，否则该章标记为⚠️待扩充，不得计入已完成章节。**

```
S 档：每章 ≥ 1500 汉字
M 档：每章 ≥ 2000 汉字
L 档：每章 ≥ 2500 汉字
XL 档：每章 ≥ 3000 汉字
```

**字数检查时机（自动执行，无需用户提醒）：**
1. **写完每章后立即检查**：用 `grep -oP '\p{Han}'` 或等价方法统计纯中文字符，低于下限则标记⚠️
2. **每5章批量复核**：检查累计字数是否达标（总汉字数 ≥ 下限 × 章数）
3. **写完一半章节时中期盘点**：当前总汉字数 ÷ 已完成章数，得到平均每章字数。若平均字数低于档位下限 × 0.8，则触发红色预警——**暂停写稿，回头扩充已有章节**

**错误处理（P0 强制）：**
- 检测到⚠️章节时，必须先扩充到目标字数才能写下一章
- 严禁为了凑章数而写低于字数下限的章节
- 若用户明确要求跳过扩充直接继续，须在 chapter-status.md 中记录 ⚠️欠债，并在全书写完后集中补写

**字数违规追溯：**
- 每写完5章，AI必须自动运行 `node scripts/chapter-wordcount-audit.mjs --book-root <bookRoot>` 审计
- 审计结果写入 `.fbs/wordcount-audit.json`
- 检测到累计欠字的，列出清单，按欠字从多到少排序，优先扩充欠字最多的章节

**自动化审计脚本（AI 必须知晓）：**

```bash
# 审计所有章节字数，输出统计表
node scripts/chapter-wordcount-audit.mjs --book-root <bookRoot>

# 仅输出未达标的章节（便于快速定位薄弱点）
node scripts/chapter-wordcount-audit.mjs --book-root <bookRoot> --failed-only

# 导出 JSON 报告供其他工具消费
node scripts/chapter-wordcount-audit.mjs --book-root <bookRoot> --json
```

**审计输出格式示例：**
```
📏 字数审计报告
档位：L（每章 ≥ 2500 汉字）
总章数：60 ✅
达标：16 章
⚠️ 未达标：44 章
总汉字数：66,140
目标总字数：150,000（60×2500）
差额：-83,860 汉字

最薄弱的10章：
Ch53 苏敏的明信片    185字  ❌ 距达标差2315字
Ch54 升职            221字  ❌ 距达标差2279字
...

💡 建议：从欠字数最多的章节开始扩充
```

### 📢 进度报告频率规则（P0 强制）

**进度报告（进度条/字数统计/章节完成通知）的输出频率，按全书目标字数分档：**

| 全书目标字数 | 档位 | 报告频率 | 示例 |
|------|------|--------|------|
| ≤ 5 万字 | S | 每章报告 | 第 1/10 章 ✅ 2510字 ⏐ 第 2/10 章 ✅ 2630字 |
| > 5 万字，≤ 20 万字 | M | 每 3 章报告 | 第 6/30 章 ██████░░░░ 20% ⏐ 差额 -60,000 |
| > 20 万字，≤ 100 万字 | L | 每 5-8 章报告 | 第 15/80 章 ████████░░ 19% ⏐ 差额 -162,500 |
| > 100 万字 | XL | 每 10+ 章（或每卷）报告 | 第 50/200 章 ██░░░░ 25% ⏐ 差额 -375,000 |

**判定规则：**
1. 首次进入 S3 时，读取 project-config.json 的总字数目标，确定档位
2. 档位一旦确定，整本书的续写全部使用该频率，中途不切换
3. 若 project-config.json 尚未写入字数目标，按「档位速查」的档位推算

**进度条输出规范（当报告条件满足时）：**
```
第 {已完成}/{总章数} 章完成 ██████░░░░░░░░░░░░░░  {X}%  预计还需：{Y} 分钟
```

**禁止行为：**
- ❌ 低于规定频率报告（百万字级每章都报告）
- ❌ 高于规定频率但跳过报告（完全不出进度条）
- ❌ 同一本书中途改变报告节奏

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

#### ⚠️ S3 入口强制预检（P0，进入S3后第一条执行）

**进入S3后，必须先执行以下预检流程，禁止越过预检直接开始写稿或读取章节。**

**步骤1：评估项目规模**
检查 `project-config.json` 的总字数与总章数。若全书总字数 ≥ 3万字 或 总章数 ≥ 10章，则为"大型项目"。若为扩写/补写已有章节，同样适用此规则。

**步骤2：读取时间跟踪数据（静默执行）**

```bash
node scripts/record-duration.mjs --action show --book-root <bookRoot> > /dev/null 2>&1
```

读取结果文件 `.fbs/time-tracking.json`，获取当前平均耗时。

**步骤3：展示时间预估并等待用户确认**

```
📖 书名：{书名}
📊 当前进度：{已完成章数}/{总章数} 章（✅ {达标章数}章达标 / ⚠️ {欠字章数}章待扩充）
⏱️ 预计剩余：约 {R} 分钟
📈 差额：-{欠字数} 字

开始写稿？[确认/取消]
```

**禁止在此步骤前执行任何 Read/Write/Edit 操作。**

*注：time-tracking 脚本静默执行，AI 不在回复中展示其过程输出。*

**步骤3：用户确认后才可进入写稿循环**
- 用户回复"确认"/"开始"/"继续" → 进入写稿
- 用户回复"取消"/"等等"/"先不做" → 停止，等待进一步指令
- **AI 禁止在展示预估后不等回复就直接开始写稿**

**步骤3.5：用户确认后、开始写稿前，AI 必须声明本任务档位与报告频率（P0）**

用户确认后，AI 回复的第一句话必须包含以下信息（与预估信息合并展示，不额外增加来回来回）：

```
📖 书名：《渡》
📊 当期档位：M（目标约 15 万字）
📢 报告频率：每 3 章报告一次进度 | 中间每章只写简短备注
⏱️ 预计剩余：约 12 分钟
📈 差额：-17,627 字

开始扩写 →
```

**声明三要素（缺一不可）：**
1. 档位（S/M/L/XL）及全书目标字数
2. 报告频率（每 N 章报告一次）
3. 中间章节只出简短备注，不出完整进度条

**原理：** 提前声明档位和报告频率，双方对齐预期，避免 AI 埋头写稿不出声或过度报告。

**步骤4：每次会话续写时重复预检**
每次会话从断点续写S3时（包括被自动暂停后恢复），必须重新执行步骤1-3。可简化为一行进度摘要，但必须等待用户确认。

---

#### ⚠️ 禁止一次性读取全部章节（P0 强制）

正确做法：
- ✅ 只读取当前正在扩写的 1-2 章
- ✅ 读完立即扩写，不要等全部读完
- ✅ 分批处理：写完第 1-2 章 → 再读第 3-4 章 → 再写
- ❌ **禁止**：先读完全部 N 章，再开始扩写

**原因**：一次性读取全部章节会触发过多工具调用，导致步骤限制会话卡死。

参考 `workflow-s3-core.md` 的 Auto-Run 分批策略：每 2 章自动暂停。读取章节也应遵循同样的分批原则。

#### ⚠️ 单轮工具调用限制（P0 强制，防止步骤爆炸）

**单轮对话最多调用 2 个工具。完成 1 个，等待结果，再调下 1 个。**

错误模式（禁止）：
```
❌ 一次性调用 8 个 Read 读取全部 8 章
❌ 一次性调用 5 个 Edit 修改多个文件
❌ 一次性调用 3 个 Bash 执行多个脚本
```

正确模式（必须）：
```
✅ 第 1 轮 → Read 读取第 1 章
✅ 第 2 轮 → Read 读取第 2 章
✅ 第 3 轮 → Write/Edit 扩写第 1 章
✅ 第 4 轮 → Write/Edit 扩写第 2 章
```

**强制规则**：
1. 单轮对话 ≤ 2 个工具调用（Read/Write/Edit/Bash 都算）
2. 读取章节：每次最多读 1-2 章，读完立即扩写，不要等全部读完
3. 修改文件：每次最多改 1-2 个文件，改完 1 个再改下 1 个
4. 执行脚本：每次最多执行 1-2 个，执行完等待结果
5. **禁止**说"先读取全部章节了解内容再扩写"——这是错误策略

---

#### 🕐 S3 写稿中的字数自查（P0 强制，每章执行）

**每章写稿流程（强制执行）：**

```bash
node scripts/record-duration.mjs --action start --chapter <编号> --book-root <bookRoot> > /dev/null 2>&1

# 第2步：写稿/扩写章节内容
# （工具调用限制：单章最多2轮）

# 第3步：写完并审计通过后，结束计时
node scripts/record-duration.mjs --action end --chapter <编号> --book-root <bookRoot> > /dev/null 2>&1
```

**⚠️ 耗时数据是机器独立的：**
`time-tracking.json` 存在书稿的 `.fbs/` 目录下，不跟随 SKILL 代码仓库。
每台机器的写稿速度不同（CPU/网络/模型延迟各异），数据天然隔离。
如果书稿目录被 git 管理，建议在 `.gitignore` 中添加 `.fbs/time-tracking.json` 防止同步。

**写完每章后，必须在回复中附带字数状态行：**

```
第12章完成 ✅ | 本章 2100汉字 | 档位下限 2500 | ⚠️ 缺400字
第12章完成 ✅ | 本章 3200汉字 | 档位下限 2500 | ✅ 达标
```

**字数不足时，不写下一章，先扩充当前章。**

字数统计方法：统计纯中文字符（排除标点、英文、数字）。

```bash
grep -oP '\p{Han}' <文件> | wc -l
```

#### 📊 每5章自动审计（P0 强制，防止累积欠字）

**每写完5章，AI 必须自动执行审计，不得跳过：**

```bash
node scripts/chapter-wordcount-audit.mjs --book-root <bookRoot>
```

审计结果差额调整策略：
- **差额 < 20%**：正常推进，单章字数适当增加
- **差额 20%-50%**：后续每章平均字数提高 30%
- **差额 > 50%**：暂停写新章，回头扩充已写章节

**中期强制盘点（写完一半章节时）：**

```bash
node scripts/chapter-wordcount-audit.mjs --book-root <bookRoot> --json > /tmp/wc-audit.json
```

读取 `totalDeficit`。若 `totalDeficit > 档位下限 × 剩余章数`，则触发红色警报：
1. 暂停写新章节
2. 列出所有⚠️章节清单，按欠字从多到少排序
3. 逐一扩充，直到 `totalDeficit ≤ 0` 再恢复写新章

**预估算法（优先真实数据，不足则用回退值）：**

```
# 优先：读取 .fbs/time-tracking.json 中的 averages.{mode}
#        如果该模式已有 ≥3 条记录，使用实际平均耗时
#        如：实际平均 192 秒/章 = 3.2 分钟/章

# 回退：无数据或记录不足时
#        扩写模式：150 秒/章（2.5 分钟）
#        新写模式：90 秒/章（1.5 分钟）

# 剩余时间（分钟）= 剩余章数 × 单章平均耗时（秒） / 60
```

查看当前耗时数据：
```bash
node scripts/record-duration.mjs --show --book-root <bookRoot>
```

**Part（卷）预估格式（适用于分卷书稿）：**

```
📖 书名：{书名}
📦 第 1 部分：{章数} 章，≈ {X} 分钟
📦 第 2 部分：{章数} 章，≈ {Y} 分钟
⏱️ 预估总用时：约 {总时间} 分钟

开始写第 2 部分第 5 章？[确认/取消]
```

#### ✍️ 多章节任务进度条

**进度条输出频率遵循「进度报告频率规则」档位，不在此处单独指定。仅在轮到报告时才输出一行进度：**

```text
第 1/10 章完成 ██░░░░░░░░░░░░░░░░  10%  预计还需：4.5 分钟
第 2/10 章完成 ████░░░░░░░░░░░░░  20%  预计还需：4 分钟
```


**示例对话（已校准）：**

```
AI：第 1 部分已完成，第 2 部分共 15 章，已完成 4 章。
⏱️ 第 2 部分预估总用时：约 7.5 分钟（15 章 × 平均 0.5 分钟/章）
⏳ 预计剩余：约 5.5 分钟
开始写第 5 章？[确认/取消]
```

#### ✍️ 进度条输出规范（参考「进度报告频率规则」档位）

```text
第 1/10 章完成 ██░░░░░░░░░░░░░░░░  10%  预计还需：4.5 分钟
第 2/10 章完成 ████░░░░░░░░░░░░░  20%  预计还需：4 分钟
第 3/10 章完成 ██████░░░░░░░░░░░  30%  预计还需：3.5 分钟
...
```

**进度条规则：**
- 依「进度报告频率规则」档位输出进度行
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

### 去AI味处理（在S4质检基础上的人工优化）

质检只能检测表层语法问题（绝对化用词、破折号密度、段落长度）。
真正的 AI 味不在于语法错误，而在于：模板化结构、空洞的宏大叙事、假数据、没有真实细节。
**去AI味的核心原则：保持原文的体裁、论点和结构不变，只替换 AI 特色的语言模式。**

#### P0 强制规则

1. **保持体裁不变** — 议论文仍是议论文，数据展示仍是数据展示，不改变体裁
2. **保持原文论点结构** — 不删除或重排原文的核心论点
3. **不得替换为个人叙事/小说体裁** — 原文是分析类文章则不能改成第一人称日记

#### 去AI味检查清单

**AI味特征（必须检查并替换）：**

| AI味模式 | 示例（原件） | ✅ 正确替换 |
|---------|-------------|-----------|
| 万能开头铺垫 | "在当今这个快速发展的时代" | 直接进入正题 |
| 空洞宏大叙事 | "这已经成为一种不可逆转的社会趋势" | 具体描述现象 |
| 假数据 | "据统计，每年有数百万的年轻人涌入" | 去掉或换真实信息 |
| 空洞抒情 | "怀揣着梦想和希望，渴望在这片热土上" | 具体描述动机 |
| 万能过渡 | "然而，并非一帆风顺" | 直接描述问题 |
| 列表式结构 | "首先……其次……再次……" | 段落内自然衔接 |
| 说教式建议 | "第一，要调整好心态……第二，要做好职业规划……" | 自然陈述建议 |
| 诗意金句结尾 | "在大城市找到属于自己的那片天空" | 平实收尾 |
| 绝对化用词 | "极大地""完全""彻底""一应俱全" | 用相对温和的表达 |

#### 替换策略

```
AI模式：        首先/其次/再次
替换为：        段落自然过渡（换行或引导句）

AI模式：        第一/第二/第三（建议列表）
替换为：        直接写建议，用逗号/句号断开

AI模式：        万能开头（在当今……）
替换为：        删掉，直接从话题开始

AI模式：        假统计（据统计……）
替换为：        去掉数字，或换具体观察

AI模式：        万能结尾（愿每一个……）
替换为：        一句平实的话收尾
```

#### 语言优化

1. **破折号密度控制**：每100字不超过1个破折号。过多的破折号会让文字像流水账。替换方案：改用句号断句、冒号引述、或直接并列。
2. **段落节奏**：避免列表式的小段落（每段只写一个观点），也避免连续几大段不拆分。根据内容自然分段，单段不超过500汉字。
3. **绝对化用语**：将"极大地"改为"相对"、"完全"改为"大部分"、"彻底"改为"确实"。
4. **空洞抒情**：将抽象的情感描写替换为具体的行为和观察。
5. **万能模板句**："在当今这个……时代""从这个角度来看""综上所述"等万能模板句一律删除或替换。
6. **说教口吻**：将"年轻人应该……""我们要……"改为"有人选择……""也可以……"等非指令性表达。

#### AI套路检测规则（S7层，40+种模式，阈值≤3个通过）

| 类别 | 模式数量 | 示例 |
|------|---------|------|
| 列表模板 | 7 | 首先、其次、再次、第一、第二、第三 |
| 万能开头 | 5 | 在当今这个…时代、随着…、近年来 |
| 宏大叙事 | 8 | 不可逆转、引发了关注、至关重要、毋庸置疑 |
| 万能过渡/结语 | 11 | 并非一帆风顺、综上所述、有鉴于此、归根结底 |
| 空洞抒情 | 6 | 怀揣梦想、属于自己的天空、扬帆起航、砥砺前行 |
| 假数据/假引用 | 5 | 据统计、数据表明、正如…所说、众所周知 |
| AI冗余表达 | 12 | 进行+动词、从…出发、不仅…更是、有效+动词 |

**计分方式**：其中任意模式命中 ≥ 4 处则判为不通过。

#### 执行流程
```
步骤1：运行 quality-auditor-lite.mjs 获取质检分数（含S7 AI套路检测）
步骤2：逐项对照去AI味检查清单，标记AI味段落
步骤3：按替换策略逐项改写，保持原文体裁和论点
步骤4：检查破折号密度（grep -oP '——' <文件> | wc -l）
步骤5：重新运行 quality-auditor-lite.mjs 验证综合分 ≥ 7.5 且 AI套路≤3处
```

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

⛔ **P0 铁律：禁止自己写导出脚本**

**永远不要**自己写合并/导出/转换脚本。SKILL 内置了全部导出脚本，**直接调用**。

**错误做法（违反即出错）：**
```
❌ 自己写 merge-chapters.mjs 或类似合并脚本
❌ 自己写 Markdown→DOCX/PDF 的转换代码
❌ 自己 npm install 然后手写转换逻辑
❌ 用 exec 运行 python3 或 sed 做格式转换
❌ 用 filesystem.write 拼 DOCX/PDF 二进制
❌ 对 export-to-docx.mjs 传 --book-root（它不接受）
```

**正确做法（唯一允许）：**
```
✅ 导出DOCX：node scripts/export-to-docx.mjs <合并后的.md> <输出.docx> [--title "书名"]
✅ 导出PDF：  node scripts/export-to-pdf.mjs  <合并后的.md> <输出.pdf>  [--title "书名"]
✅ 合并全稿：node scripts/merge-chapters.mjs --book-root <书稿根目录> --output <输出.md>
```

**各脚本实际接受的参数：**

| 脚本 | 参数类型 | 正确示例 |
|------|---------|---------|
| `merge-chapters.mjs` | `--book-root --output [--glob]` | `node scripts/merge-chapters.mjs --book-root /root/books/渡 --output 渡-全稿.md` |
| `export-to-docx.mjs` | `<input.md> <output.docx>` 位置参数 | `node scripts/export-to-docx.mjs 渡-全稿.md 渡.docx --title "渡" --author "作者"` |
| `export-to-pdf.mjs` | `<input.md> <output.pdf>` 位置参数 | `node scripts/export-to-pdf.mjs 渡-全稿.md 渡.pdf --title "渡"` |

**支持格式：**

| 格式 | 命令 | 依赖 |
|------|------|------|
| Markdown | `merge-chapters.mjs` 输出自带 | 无 |
| HTML | `renderMarkdownPreview()` | `markdown-it` |
| DOCX | `export-to-docx.mjs` | `html-to-docx`（已安装） |
| PDF | `export-to-pdf.mjs` | `puppeteer`（已安装） |

**正确工作流：**
```bash
# 1. 先合并全稿（必须，禁止直接导出单章）
node scripts/merge-chapters.mjs --book-root <书稿根目录> --output 全稿.md

# 2. 清理过程标注（章末标记、跟踪注释）
node scripts/strip-manuscript-annotations.mjs \
  --input 全稿.md --output 交付稿.md --toc

# 3. 再导出 DOCX/PDF（必须用清理后的交付稿）
node scripts/export-to-docx.mjs 交付稿.md 书籍.docx --title "书名"
node scripts/export-to-pdf.mjs  交付稿.md 书籍.pdf  --title "书名"

# 4. 交付（可选）
node scripts/deliver-export.mjs 书籍.docx
```

⚠️ **禁止用含过程标注的全稿直接导出**

**⚠️ 注意**：导出前必须先合并章节，禁止直接导出单章文件。`export-to-docx.mjs` 和 `export-to-pdf.mjs` 不接受 `--book-root` 参数，只接受 `<输入文件> <输出文件>` 位置参数。

**⚠️ 导出前必须清理过程标注（P0）**：合并后的全稿包含写作过程的章末标记（`**（第X章完）**`）和内部跟踪注释（`<!-- source: ... -->`），交付前必须使用 `strip-manuscript-annotations.mjs` 清理。

```bash
node scripts/strip-manuscript-annotations.mjs \
  --input 全稿.md \
  --output 交付稿.md \
  --toc    # 可选：自动生成目录
```

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

## 降重改写预设（P1 场景模块）

### 触发方式

用户说 **降重改写** / **降重** / **换一种说法** / **查重** 时进入此模式。

### 适用场景

| 场景 | 说明 |
|------|------|
| 稿件投递 | 已有初稿需降低与原文/网上内容的相似度 |
| 学术改编 | 将原创内容用不同句式重述（非学术不端，而是合理改写） |
| 平台转投 | 同一内容投递不同平台需避免文本雷同 |
| 多版本发布 | 同一主题产生多个版本供不同渠道使用 |

### 执行流程

```
1. 用户说「降重改写」
   ↓
2. 确认用户指定的章节/文件范围
   ↓
3. AI 按降重改写策略逐章处理：
   a. 句式变换（主动↔被动、长短句互换、因果重组）
   b. 同义词替换（高频词首轮替换，第二轮复查遗漏）
   c. 语序调整（状语位置、定语从句拆分、引用插入位置）
   d. 段落重组（相邻合并/对调、长段切短）
   ↓
4. 每改完 1 章自查：是否有同义复述（原文换皮）→ 需进一步调整
   ↓
5. 全部完成后对比原文，逐章确认含义无偏差
```

### 降重改写六大策略（P1 强制遵守）

#### 1. 句式变换（优先级最高）

| 原句式 | 变换后 | 示例 |
|--------|--------|------|
| 主动句 | 被动句 | 「电商平台降低了准入门槛」→「准入门槛被电商平台降低了」 |
| 长句 | 拆短句（超 40 字拆） | 「这款产品通过AI技术实现了……识别和自动处理」→「这款产品使用了AI技术。它能……识别，并能自动处理……」 |
| 因果式 | 变体 | 「因为技术不成熟，所以方案搁浅」→「方案搁浅的原因是技术不成熟」 |
| 条件式 | 假设式 | 「如果……就……」→「一旦……必然……」 |
| 并列式 | 递进式 | 「既……又……」→「不仅……而且……」 |

#### 2. 同义词替换

- 动词/形容词/副词：替换率 ≥ 40%（按词计，非按字符）
- 同一词在同一章内出现 ≥ 3 次，必须替换为同义表达
- 专业术语：首次使用全称，之后交替使用全称/缩写/描述性代称
- **禁止**：用生僻字替换常用词（保持可读性）

#### 3. 语序调整

- 时间状语前置 ↔ 后置：「昨天，他去了北京」→「他昨天去了北京」
- 地点状语位置调整：「在上海的会议上」→「会议上，在上海……」
- 定语从句拆分为独立句：「这是昨天刚研发出来的功能，可以有效……」→「这个功能是昨天刚研发出来的。它可以有效……」
- 引用/举例的插入位置前移或后置
- 条件/让步从句：「虽然……但是……」→「……尽管如此，……」

#### 4. 段落重组

- 相邻段落合并（主题紧密的 2 段合并为 1 段）
- 长段落（> 6 句）拆分为 2-3 个短段落
- 相邻章节的第一段和最后一段互换内容组织方式
- 过渡句重写（避免"正如上文所说…""如前所述…"等模板）

#### 5. 修辞替换

- 比喻/类比/引用：保留原意，更换喻体
- 排比句：调整排列顺序或增减排比项
- 设问句：改为陈述句或反问句

#### 6. 数据/案例微调（不改变真实性）

- 数据呈现方式：表格→文字 / 文字→列表 / 百分比→分数
- 案例描述的叙事顺序调换（时间正序↔倒叙↔插叙）
- 案例的主角/场景细节微调（不影响真实性的范围）

### 降重改写禁止行为（P0 强制）

```
❌ 改变核心论点或数据含义
❌ 直接复制原文后仅替换几个词（"替换式抄袭"）
❌ 将原文内容完全删除（这是删减，不是改写）
❌ 使用机器翻译后再译回（产生不通顺的中文）
❌ 引入不准确的信息替换原数据
❌ 改写后不检查含义偏差就直接交付
```

### 降重质量自查（每章改完后必须执行）

```
1. □ 原文与改写的句子层面相似度 ≤ 60%？
   判断方式：读改写句，看是否有「原文换皮」的感觉
2. □ 核心术语/关键数据全部保留且含义未变？
3. □ 改写后中文通顺无机器味？
4. □ 未使用生僻/不自然词汇？
5. □ 逻辑链条未被打断或扭曲？

以上 5 项全部达标 → 该章降重完成 ✅
≥ 1 项不达标 → 回到策略列表重新调整
```

### 降重改写 + 去AI味联动规则

降重改写完成后，建议追加「去AI味」处理，覆盖降重过程中可能引入的机器表达。
顺序：**先降重 → 再去AI味 → 最后交付**

---

## 触发词（完整版）

**主触发**：写书、出书

**写作类**：写长篇、写网络小说、写网文、番茄小说、起点中文网、晋江文学城、写手册、写白皮书、写行业指南、写报道、写专题、写调查报道、写长文

**流程类**：定大纲、写章节、整理素材

**质量类**：去AI味、降重改写、质量自检

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
