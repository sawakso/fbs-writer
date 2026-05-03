# 适配方案设计 v1.0

> 任务编号：2701 | Phase 1.3 交付物（方案评审文档）
> 作者：庞炳戌 | 日期：2026-04-28
> 状态：待导师评审

---

## 一、整体架构方案：「共享核心 + 平台包装层」

### 1.1 设计原则

| 原则 | 说明 |
|------|------|
| **核心不动** | `references/`、`assets/` 等核心文档和构建脚本保持原位，不修改 |
| **按需复用** | `commands/` 内容迁移到 `shared/commands/`，两个平台均可引用 |
| **适配层最薄** | OpenClaw 适配层只做「翻译」，不重复业务逻辑 |
| **不破坏现有** | WorkBuddy / CodeBuddy 原有功能完全不受影响 |

### 1.2 最终目录结构

```
fbs-bookwriter/
│
├── commands/                    # ✅ 保留（WorkBuddy 原有，不动）
│   ├── write-book.md
│   ├── book-outline.md
│   ├── book-chapter.md
│   ├── book-build.md
│   ├── book-review.md
│   ├── book-style.md
│   ├── book-competitor.md
│   └── book-check.md
│
├── references/                  # ✅ 保留（规则库，不动）
│   ├── presets.md
│   ├── strategy.md
│   ├── templates.md
│   ├── quality-S.md
│   ├── quality-PLC.md
│   ├── quality-check.md
│   ├── visual.md
│   ├── typography.md
│   └── build.md
│
├── assets/                      # ✅ 保留（构建工具，不动）
│   ├── books.config.js
│   ├── build.mjs
│   └── style.css
│
├── openclaw/                    # 🆕 新增 OpenClaw 适配层
│   ├── skill.json               # OpenClaw 技能配置文件（触发词 + 命令 + 权限）
│   ├── index.ts                 # OpenClaw 入口（ClawSkill 子类）
│   ├── package.json             # OpenClaw 版本依赖
│   ├── README.md                # OpenClaw 版本安装与使用说明
│   └── adapter/                 # 平台适配层
│       ├── context-mapper.ts    # 上下文映射（.fbs 文件读写 + references 加载）
│       ├── result-formatter.ts  # 结果格式化（SkillOutput 适配）
│       ├── intake-router.ts     # 意图路由（关键词/命令 → 处理器）
│       └── fbs-state-manager.ts # .fbs 状态文件管理器
│
├── docs/                        # 🆕 新增技术文档目录
│   ├── openclaw-adapter-architecture.md  # Phase 1.1 架构映射文档
│   ├── openclaw-skill-spec-analysis.md   # Phase 1.2 规范分析文档
│   ├── adapter-plan-v1.md                # Phase 1.3 本文档
│   └── DEVELOPMENT.md                    # 双通道开发指南（Phase 3 交付）
│
├── README.md                    # ✅ 保留（更新安装说明，加入 OpenClaw 入口）
└── CHANGELOG.md                 # 🆕 新增变更日志
```

---

## 二、skill.json 配置方案

### 2.1 完整配置

```json
{
  "name": "fbs-bookwriter",
  "displayName": "福帮手·AI写书",
  "version": "4.0.0",
  "description": "人机协同创作实操手册、白皮书、行业指南。六阶段工作流，去AI味质量标准，支持跨会话续写。",
  "author": "福帮手AI协同平台",
  "license": "MIT",
  "homepage": "https://github.com/fubangshou/fbs-bookwriter",
  
  "triggers": {
    "keywords": [
      "福帮手", "写书", "出书", "写长文", "写长篇",
      "写白皮书", "写手册", "写行业指南", "写深度稿",
      "写特稿", "写专题", "写报道", "写调查报道",
      "帮我写本书", "AI写书", "协作写书",
      "定大纲", "写章节", "封面", "排版构建",
      "导出", "质量自检", "图文书", "激活原料",
      "原料盘点", "整理素材", "拆书改写",
      "海外本地化改写", "爆款结构改写"
    ],
    "commands": [
      { "name": "write-book",    "description": "启动完整六阶段写书工作流" },
      { "name": "book-outline",  "description": "目录设计 + 视觉规划" },
      { "name": "book-chapter",  "description": "单章写作" },
      { "name": "book-build",    "description": "排版构建" },
      { "name": "book-review",   "description": "质量终审" },
      { "name": "book-style",    "description": "风格档案管理" },
      { "name": "book-competitor","description": "竞品扫描" },
      { "name": "book-check",    "description": "质量检查" }
    ]
  },

  "context": {
    "alwaysLoad": [
      "../references/presets.md",
      "../references/strategy.md"
    ],
    "lazyLoad": {
      "writing": [
        "../references/templates.md",
        "../references/quality-S.md",
        "../references/quality-PLC.md"
      ],
      "quality": [
        "../references/quality-check.md"
      ],
      "visual": [
        "../references/visual.md",
        "../references/typography.md"
      ],
      "build": [
        "../references/build.md"
      ]
    }
  },

  "runtime": {
    "node": ">=18.0.0",
    "entry": "index.ts",
    "permissions": ["filesystem", "network"]
  },

  "capabilities": {
    "multiRound": true,
    "sessionPersistence": true,
    "fileOutput": true,
    "networkAccess": true,
    "streaming": true
  }
}
```

### 2.2 关键设计决策说明

**① 为什么 context 分 alwaysLoad / lazyLoad？**
- `presets.md` + `strategy.md` 是任何写书场景都需要的基础知识，始终加载
- 其他规则文档按阶段按需加载，减少 token 消耗，提升响应速度

**② 为什么权限只要 filesystem + network？**
- `filesystem`：读写 .fbs 状态文件、保存 Markdown 产出物
- `network`：联网搜索验证数据（阶段3 Researcher 角色）
- 不需要 `subprocess`，因为 `build.mjs` 作为可选本地工具，不强依赖

---

## 三、关键接口设计

### 3.1 入口类（openclaw/index.ts）

```typescript
import { ClawSkill, SkillInput, SkillOutput } from "@openclaw/sdk";
import { IntakeRouter } from "./adapter/intake-router";
import { FbsStateManager } from "./adapter/fbs-state-manager";
import { ContextMapper } from "./adapter/context-mapper";

export class FbsBookwriterSkill extends ClawSkill {
  private router: IntakeRouter;
  private stateManager: FbsStateManager;
  private contextMapper: ContextMapper;

  constructor(ctx) {
    super(ctx);
    this.stateManager = new FbsStateManager(this.fs);
    this.contextMapper = new ContextMapper(this.stateManager);
    this.router = new IntakeRouter(this.contextMapper);
  }

  async run(input: SkillInput): Promise<SkillOutput> {
    // 1. 路由识别：命令/关键词 → 处理器
    const handler = this.router.route(input);
    
    // 2. 加载必要的上下文文档
    const context = await this.contextMapper.buildContext(handler.requiredRefs);
    
    // 3. 执行处理器（流式输出）
    return await handler.execute(input, context, {
      emit: this.emit.bind(this),
      session: this.session,
      fs: this.fs
    });
  }

  async resume(): Promise<SkillOutput> {
    const resumeCard = await this.stateManager.loadResumeCard();
    if (!resumeCard) {
      return { content: "没有找到上次的写书进度。\n\n请说「帮我写本书」开始新书，或提供 `.fbs/workbuddy-resume.json` 文件路径。" };
    }
    return this.run({
      command: "write-book",
      userMessage: "继续",
      sessionId: this.ctx.sessionId,
      args: { resumeCard }
    });
  }
}
```

### 3.2 意图路由（openclaw/adapter/intake-router.ts）

```typescript
type HandlerName = 
  | "write-book" | "book-outline" | "book-chapter"
  | "book-build" | "book-review" | "book-style"
  | "book-competitor" | "book-check" | "resume";

// 关键词 → 处理器映射表
const KEYWORD_ROUTES: Array<{ patterns: RegExp[], handler: HandlerName }> = [
  { patterns: [/继续|恢复|接着写/], handler: "resume" },
  { patterns: [/目录|大纲|章节设计/], handler: "book-outline" },
  { patterns: [/第[0-9一二三四五六七八九十]+章|写章节/], handler: "book-chapter" },
  { patterns: [/构建|生成PDF|排版|导出/], handler: "book-build" },
  { patterns: [/质检|检查质量|自检|质量报告/], handler: "book-check" },
  { patterns: [/终审|最终审核/], handler: "book-review" },
  { patterns: [/风格|风格档案/], handler: "book-style" },
  { patterns: [/竞品|对标分析/], handler: "book-competitor" },
  // 兜底：写书主流程
  { patterns: [/写书|出书|写手册|写白皮书|写长文|帮我写|福帮手/], handler: "write-book" },
];

export class IntakeRouter {
  route(input: SkillInput): Handler {
    // 优先级1：明确命令名称
    if (input.command && handlers[input.command]) {
      return handlers[input.command];
    }
    // 优先级2：关键词匹配
    for (const { patterns, handler } of KEYWORD_ROUTES) {
      if (patterns.some(p => p.test(input.userMessage))) {
        return handlers[handler];
      }
    }
    // 兜底：进入写书主流程
    return handlers["write-book"];
  }
}
```

### 3.3 状态管理（openclaw/adapter/fbs-state-manager.ts）

```typescript
interface ResumeCard {
  version: string;
  book_title: string;
  current_stage: "S1" | "S2" | "S3" | "S4" | "S5" | "S6";
  current_chapter?: number;
  total_chapters?: number;
  style_preset: string;
  size: "light" | "standard" | "whitepaper";
  depth: "fast" | "standard" | "deep";
  completed_chapters: number[];
  style_profile: Record<string, any>;
  outline: any[];
  last_session: string;
  run_logs: any[];
}

export class FbsStateManager {
  private readonly resumeCardPath = ".fbs/workbuddy-resume.json";

  async loadResumeCard(): Promise<ResumeCard | null> {
    try {
      const content = await this.fs.read(this.resumeCardPath);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async saveResumeCard(card: Partial<ResumeCard>): Promise<void> {
    const existing = await this.loadResumeCard() || {};
    const updated = {
      ...existing,
      ...card,
      last_session: new Date().toISOString()
    };
    await this.fs.write(this.resumeCardPath, JSON.stringify(updated, null, 2));
  }

  async updateProgress(chapter: number, stage: string): Promise<void> {
    const card = await this.loadResumeCard();
    if (!card) return;
    
    if (!card.completed_chapters.includes(chapter)) {
      card.completed_chapters.push(chapter);
    }
    card.current_chapter = chapter;
    card.current_stage = stage as any;
    
    await this.saveResumeCard(card);
  }
}
```

---

## 四、关键功能适配方案

### 4.1 S0/S1 初始化阶段

```
用户触发（任意写书关键词）
  ↓
IntakeRouter → WriteBookHandler
  ↓
检查是否存在 .fbs/workbuddy-resume.json
  ├─ 存在 → 询问：「发现上次的进度，是继续还是重新开始？」
  └─ 不存在 → 进入 S1 问答（主题/读者/风格/体量）
  ↓
读取 references/presets.md + references/strategy.md（alwaysLoad）
  ↓
AI 执行 commands/write-book.md 定义的六阶段工作流
  ↓
S1 完成 → 写入 .fbs/workbuddy-resume.json（stage: "S1_confirmed"）
  ↓
流式输出 [S1] 定位确认稿 + [S1] 风格档案
```

### 4.2 S3 写作阶段（单章）

```
用户说「写第三章」或 /book-chapter --chapter=3
  ↓
IntakeRouter → BookChapterHandler
  ↓
读取 .fbs/workbuddy-resume.json → 获取风格档案 + 目录结构
  ↓
加载 references/templates.md + quality-S.md（lazyLoad: writing）
  ↓
AI 执行 commands/book-chapter.md 定义的四流三审流程：
  ├─ Researcher：联网搜索本章数据
  ├─ Writer：生成初稿
  ├─ Illustrator：Mermaid 图表
  └─ Critic-S/L1/L2：质量审查
  ↓
评分 ≥ 7.5 → 流式输出章节内容 + 质量报告
  ↓
保存章节到 src/chapter-03.md
  ↓
更新 .fbs/workbuddy-resume.json（completed_chapters: [3]）
```

### 4.3 质量自检

```
用户说「检查质量」 / 「自检」
  ↓
IntakeRouter → BookCheckHandler（--level=simple/detailed）
  ↓
加载 references/quality-check.md + quality-S.md + quality-PLC.md
  ↓
AI 执行 commands/book-check.md 的质检流程
  ↓
输出：
  精简模式：「总评 7.8/10 | S层✓ P层✓ C层需关注（C3结构均匀）」
  详细模式：S/P/C/B/V1 五层完整报告
```

### 4.4 会话恢复

```
用户说「继续」/「继续写书」/ 打开新会话后直接说「继续」
  ↓
IntakeRouter 检测到"继续"关键词 → FbsBookwriterSkill.resume()
  ↓
FbsStateManager.loadResumeCard() → 读取 .fbs/workbuddy-resume.json
  ├─ 找到 → 输出恢复摘要：
  │   「📖 《[书名]》进度恢复
  │    · 已完成：第1-4章
  │    · 当前进度：第5章（共12章）
  │    · 策略：标准×标准协同
  │    输入「继续」开始写第5章，或说「第X章」跳转。」
  └─ 未找到 → 「没有找到进度文件，请说「帮我写本书」开始新书」
```

---

## 五、错误处理机制

### 5.1 统一异常层

```typescript
// 所有 Handler 都通过这个包装器执行，统一捕获异常
async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T | SkillOutput> {
  try {
    return await fn();
  } catch (error) {
    // 不把技术报错甩给用户
    return {
      content: getHumanReadableError(error, context),
      artifacts: []
    };
  }
}

function getHumanReadableError(error: Error, context: string): string {
  if (error.message.includes("ENOENT")) {
    return `📁 找不到 ${context} 需要的文件，请确认工作目录是否正确。\n可以说「帮我写本书」重新开始。`;
  }
  if (error.message.includes("network") || error.message.includes("fetch")) {
    return `🌐 网络访问失败，联网验证数据将跳过。\n继续写作将使用已有知识，数据准确性可能有所降低。`;
  }
  if (error.message.includes("JSON")) {
    return `📋 进度文件格式有问题，恢复卡可能已损坏。\n建议说「帮我写本书」重新开始，或提供备份的 .fbs 目录。`;
  }
  return `⚠️ 遇到了一个问题（${context}）：${error.message}\n\n请截图后联系福帮手支持。`;
}
```

### 5.2 功能降级策略

| 功能 | 正常 | 降级条件 | 降级方案 |
|------|------|---------|---------|
| 联网搜索 | Researcher 角色联网获取数据 | 网络不可用 | 使用 AI 内置知识，标注「[待校验]」 |
| 封面生成 | L1 AI 图像生成 | 图像工具不可用 | 降级到 L2 SVG 封面 → L3 纯文字 |
| PDF/DOCX 构建 | node build.mjs | Node.js 未安装 | 仅输出 Markdown，提示安装 Node.js |
| .fbs 文件写入 | 标准文件系统写入 | 权限不足 | 将状态输出为文本，提示用户手动保存 |

---

## 六、目录结构与任务节点对应关系

| 里程碑 | 对应文件 | 验收标准 |
|--------|---------|---------|
| M1（方案评审）| `docs/*.md` × 3 | 本文档导师评审通过 |
| M2（入口跑通）| `openclaw/skill.json` + `index.ts` + `intake-router.ts` | 触发词激活 Skill，不报错 |
| M3（核心功能）| `fbs-state-manager.ts` + `context-mapper.ts` | S0→S3→恢复完整跑通 |
| M4（测试修复）| `docs/test-cases.md` + Bug 修复 | 4个核心场景测试通过 |
| M5（最终交付）| `openclaw/README.md` + `CHANGELOG.md` | PR 提交 + 录屏演示 |

---

## 七、风险与缓解措施

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| OpenClaw SDK 接口与推演不一致 | 中 | 高 | M2 阶段立即用真实 SDK 验证接口，有偏差时调整 adapter 层 |
| .fbs 文件路径在 OpenClaw 沙箱中不可写 | 低 | 中 | 使用 `session` 对象作为备用状态存储 |
| references/ 文档上下文过长超出 token 限制 | 中 | 中 | lazyLoad 策略 + 只加载当前阶段需要的文档 |
| 构建工具在 OpenClaw 环境中不可用 | 低 | 低 | 构建功能标记为「可选」，始终保留 Markdown 输出作为兜底 |
| 现有 WorkBuddy 功能被破坏 | 低 | 高 | `commands/` 和 `references/` 绝对不修改；新增文件只在 `openclaw/` 和 `docs/` 目录 |

---

## 八、方案评审检查清单

- [ ] 架构方案：「共享核心 + 平台包装层」获导师认可
- [ ] skill.json 配置：触发词、命令、权限设计合理
- [ ] 入口类设计：ClawSkill 子类接口清晰
- [ ] 路由设计：意图识别逻辑覆盖全部使用场景
- [ ] .fbs 状态管理：读写接口与错误处理完备
- [ ] 错误处理：所有异常场景都有用户友好提示
- [ ] 不破坏现有：WorkBuddy 层零修改原则确认
- [ ] 风险已识别：4个主要风险均有缓解措施

---

*文档版本：v1.0 | 2026-04-28 | 任务编号 2701*
*等待导师评审后进入编码阶段*
