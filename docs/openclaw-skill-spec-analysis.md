# OpenClaw Skills 开发规范分析

> 任务编号：2701 | Phase 1.2 交付物
> 作者：庞炳戌 | 日期：2026-04-28

---

## 1. OpenClaw Skills 开发核心要点总结

OpenClaw 是一个以「技能包（Skill）」为核心单元的 AI 能力市场平台。用户安装一个 Skill，就等于为其 AI 助手加载了一套专业能力。

### 1.1 Skill 的本质定义

> OpenClaw Skill = **配置文件（skill.json）+ 入口逻辑（index.ts）+ 上下文资源（references/）**

Skill 不是一个传统意义上的程序，而是一套让 AI 按照规则行事的「规则包 + 触发机制」。

### 1.2 Skill 的核心结构

```
my-skill/
├── skill.json          # 技能清单（必须）：元数据、触发词、参数定义
├── index.ts            # 入口脚本（必须）：ClawSkill 子类，业务逻辑
├── references/         # 上下文注入文档（可选）：AI 规则知识库
├── scripts/            # 辅助脚本（可选）：工具函数
├── package.json        # 依赖声明（可选）
└── README.md           # 安装说明（必须）
```

---

## 2. skill.json 配置规范

### 2.1 完整字段说明

```json
{
  "name": "fbs-bookwriter",
  "version": "4.0.0",
  "description": "福帮手·人机协同写书 v4 - AI 辅助创作实操手册、白皮书、行业指南",
  "author": "福帮手AI协同平台",
  "license": "MIT",
  
  "triggers": {
    "keywords": [
      "福帮手", "写书", "写长文", "写白皮书", "写手册",
      "写行业指南", "写深度稿", "出书", "帮我写本书",
      "协作写书", "定大纲", "写章节", "AI写书"
    ],
    "commands": [
      {
        "name": "write-book",
        "description": "启动完整六阶段写书工作流",
        "args": [
          { "name": "topic", "alias": "t", "type": "string", "description": "书籍核心主题" },
          { "name": "audience", "alias": "a", "type": "string", "description": "目标读者群体" },
          { "name": "style", "alias": "s", "type": "string", "enum": ["practical","guide","whitepaper","consulting","tutorial"], "description": "风格预设" },
          { "name": "size", "alias": "z", "type": "string", "enum": ["light","standard","whitepaper"], "description": "体量" },
          { "name": "depth", "alias": "d", "type": "string", "enum": ["fast","standard","deep"], "description": "协作深度" }
        ]
      },
      {
        "name": "book-outline",
        "description": "目录设计 + 视觉规划（仅阶段2）"
      },
      {
        "name": "book-chapter",
        "description": "单章写作",
        "args": [
          { "name": "chapter", "type": "number", "description": "章节号", "required": true }
        ]
      },
      {
        "name": "book-build",
        "description": "排版构建，生成 MD/HTML/PDF/DOCX",
        "args": [
          { "name": "format", "type": "string", "enum": ["md","pdf","docx","all"], "default": "md" }
        ]
      },
      {
        "name": "book-check",
        "description": "质量检查，输出去AI味质量报告",
        "args": [
          { "name": "level", "type": "string", "enum": ["simple","detailed"], "default": "simple" },
          { "name": "scope", "type": "string", "enum": ["chapter","book"], "default": "chapter" }
        ]
      },
      {
        "name": "book-review",
        "description": "质量终审（阶段5完整流程）"
      },
      {
        "name": "book-style",
        "description": "风格档案管理"
      },
      {
        "name": "book-competitor",
        "description": "竞品扫描"
      }
    ]
  },

  "context": {
    "references": [
      "references/presets.md",
      "references/strategy.md",
      "references/templates.md",
      "references/quality-S.md",
      "references/quality-PLC.md",
      "references/quality-check.md",
      "references/visual.md",
      "references/typography.md",
      "references/build.md"
    ]
  },

  "runtime": {
    "node": ">=18.0.0",
    "permissions": ["filesystem", "network", "subprocess"]
  },

  "capabilities": {
    "multiRound": true,
    "sessionPersistence": true,
    "fileOutput": true,
    "networkAccess": true
  }
}
```

### 2.2 skill.json 与 plugin.json 对比

| 字段 | plugin.json（WorkBuddy）| skill.json（OpenClaw）|
|------|------------------------|----------------------|
| 命令注册 | `commands[]` 列表 | `triggers.commands[]` |
| 触发词 | 无（靠斜杠命令）| `triggers.keywords[]` 支持自然语言触发 |
| 参数定义 | 在命令 .md 文件里描述 | 在 `skill.json` 结构化声明 |
| 权限声明 | 隐式（继承宿主）| 显式 `runtime.permissions` |
| 上下文文件 | 无（AI 自动读取）| `context.references[]` 显式声明 |

---

## 3. OpenClaw Skill 触发机制

### 3.1 三种触发方式

```
触发方式1：关键词触发（自然语言）
  用户说："帮我写一本关于AI的白皮书"
    → OpenClaw 检测到关键词"白皮书" → 激活 fbs-bookwriter Skill
    → 调用 ClawSkill.run({ intent: "write-book", params: { style: "whitepaper" } })

触发方式2：命令触发（CLI 风格）
  用户输入：/write-book --topic="AI时代的营销手册" --style=practical
    → 解析命令名称 + 参数 → 直接路由到对应处理器
    → 调用 ClawSkill.run({ command: "write-book", args: {...} })

触发方式3：上下文触发（对话中识别）
  用户说："继续写书"
    → OpenClaw 检测会话上下文 + 关键词"继续"
    → 调用 ClawSkill.resume() → 读取 .fbs 恢复卡
```

### 3.2 触发词映射表

| 用户说的话 | 映射到的 Skill 命令 | 入参推断 |
|-----------|-------------------|---------|
| "帮我写本书" | `write-book` | 无，进入交互式问答 |
| "写一本关于XX的白皮书" | `write-book` | `--topic="XX" --style=whitepaper` |
| "帮我定目录" / "设计目录" | `book-outline` | - |
| "写第三章" | `book-chapter` | `--chapter=3` |
| "检查一下质量" | `book-check` | `--level=simple` |
| "详细质检" / "自检" | `book-check` | `--level=detailed` |
| "构建" / "生成PDF" | `book-build` | `--format=pdf` |
| "继续" / "继续写书" | 恢复会话 → `write-book` | 读取 .fbs 恢复卡 |
| "福帮手退出" | 保存状态 → 退出 | 写入 .fbs 恢复卡 |

---

## 4. 参数传递模式

### 4.1 ClawSkill 核心类接口（推演）

```typescript
// OpenClaw SDK 核心接口（基于公开规范推演）
abstract class ClawSkill {
  // 上下文对象：包含用户消息、会话历史、工作目录等
  protected ctx: SkillContext;
  
  // 会话持久化存储
  protected session: SkillSession;
  
  // 核心执行方法（子类必须实现）
  abstract run(input: SkillInput): Promise<SkillOutput>;
  
  // 会话恢复（可选覆盖）
  async resume(): Promise<SkillOutput>;
  
  // 加载 references/ 中的上下文文档
  protected async loadReference(path: string): Promise<string>;
  
  // 文件系统操作（沙箱安全）
  protected readonly fs: SkillFileSystem;
  
  // 向用户输出（支持流式）
  protected async emit(chunk: string): Promise<void>;
  protected async emitBlock(markdown: string): Promise<void>;
}

// 输入结构
interface SkillInput {
  command?: string;              // 命令名称
  args?: Record<string, any>;   // 命令行参数
  intent?: string;              // 自然语言意图
  userMessage: string;          // 原始用户消息
  sessionId: string;            // 会话 ID
}

// 输出结构
interface SkillOutput {
  content: string;              // 输出内容（Markdown）
  artifacts?: Artifact[];       // 文件产出物
  nextAction?: string;          // 引导下一步操作
  sessionUpdate?: Partial<SkillSession>;  // 需要持久化的状态变更
}
```

### 4.2 参数传递链路

```
用户输入
  ↓
OpenClaw 路由层（匹配触发词/命令）
  ↓
SkillInput 构造（command + args + userMessage + sessionId）
  ↓
FbsBookwriterSkill.run(input)  [openclaw/index.ts]
  ↓
IntakeRouter.route(input)      [识别意图，分发到对应处理器]
  ↓
对应 Handler（WriteBookHandler / BookChapterHandler / ...）
  ↓
加载对应 references/ 文档 → 构建 AI prompt
  ↓
AI 执行工作流 → 流式返回结果
  ↓
ResultFormatter.format(output) → 格式化为 SkillOutput
  ↓
OpenClaw 渲染层显示结果
```

---

## 5. 结果返回模式

### 5.1 流式输出（推荐）

```typescript
// 渐进式输出：有结果即推送，不等全部生成
async run(input: SkillInput): Promise<SkillOutput> {
  // 立即输出进度提示
  await this.emit("✍️ 正在启动写书流程...\n");
  
  // 阶段1：定位
  await this.emit("📍 阶段1：定位分析中...\n");
  const positioning = await this.runStage1(input);
  await this.emitBlock(positioning.markdown);
  
  // 阶段2：目录
  await this.emit("📋 阶段2：目录设计中...\n");
  // ...
  
  return { content: finalOutput, artifacts: [...] };
}
```

### 5.2 结构化输出格式

```typescript
// fbs-bookwriter 的输出都是 Markdown，OpenClaw 原生支持
// 不需要特殊格式化，只需确保产出物编号规范统一

const output: SkillOutput = {
  content: `
## [S1] 定位确认稿

**核心主张**：${positioning.thesis}
**目标读者**：${positioning.audience}
...

## [S1] 风格档案
...
  `,
  artifacts: [
    {
      type: "file",
      name: "outline.md",
      path: ".fbs/outline.json",
      description: "目录结构文件"
    }
  ],
  nextAction: "请确认以上定位，或说「调整主题」修改。",
  sessionUpdate: {
    stage: "S1_confirmed",
    positioning: positioning
  }
};
```

---

## 6. 现成 OpenClaw Skill 示例分析

### 6.1 典型 Skill 模式（基于公开资料分析）

**模式 A：纯提示词注入型（最简单）**
```
skill.json → 声明触发词
references/prompt.md → 包含完整系统提示词
index.ts → 极简，仅负责加载 prompt.md 并传给 AI
```
*适用场景*：单一功能、无状态的 Skill（如翻译、摘要）

**模式 B：多命令路由型（中等复杂）**
```
skill.json → 声明多个 commands
index.ts → IntakeRouter 路由到不同 Handler
references/*.md → 各 Handler 对应的规则文档
```
*适用场景*：多功能组合型 Skill，如 fbs-bookwriter ← **我们采用这个模式**

**模式 C：有状态工作流型（复杂）**
```
skill.json → 声明 multiRound: true + sessionPersistence: true
index.ts → 状态机管理（S1→S2→S3→S4→S5→S6）
session → 跨轮次持久化工作状态
.fbs/ → 跨会话持久化文件
```
*适用场景*：需要多步骤确认、跨会话续写的复杂工作流 ← **fbs-bookwriter 是这种**

### 6.2 fbs-bookwriter 适用的 Skill 模式

fbs-bookwriter 是**模式 B + 模式 C 的组合**：
- 多命令路由（8个 commands）→ 模式 B
- 有状态工作流（六阶段 + 跨会话恢复）→ 模式 C
- 规则驱动（大量 references/ 文档）→ 模式 A 的核心思想

---

## 7. Phase 1.2 结论

1. **OpenClaw Skill 的核心门槛不高**：`skill.json`（配置）+ `ClawSkill`（入口类）就是骨架，其余都是业务逻辑。
2. **fbs-bookwriter 天然适合 OpenClaw**：核心工作流是 Markdown 文档驱动的 AI 指令，跟平台解耦，几乎无缝迁移。
3. **最需要新写的代码**：`IntakeRouter`（意图识别路由）和 `ContextMapper`（.fbs 文件读写），其余基本是配置和包装。
4. **触发词机制是亮点**：OpenClaw 的关键词触发比 WorkBuddy 的斜杠命令更自然，「帮我写本书」就能直接触发。

---

*文档版本：v1.0 | 2026-04-28 | 任务编号 2701*
