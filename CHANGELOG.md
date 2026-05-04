# 变更日志

本文档记录 FBS-Writer 的所有 notable changes，格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 🎉 新增

- **新用户激活SOP（P0）**
  - 首次进入流程：欢迎 → 询问目录 → 初始化项目 → 引导下一步
  - 防止AI不问目录直接创建文件
  - 相关文件：SKILL.md 新用户激活SOP 章节

- **跨会话项目状态持久化（P1）**
  - 新增 `scripts/read-project-registry.mjs` 读取全局注册表 CLI 入口
  - 恢复优先流程升级：先读全局注册表列出已有项目，用户选完再走文件级恢复
  - 项目扫描规则优先查注册表，注册表空才走 intake-router
  - 自动保存时机：会话退出 / 每5章 / 大纲生成完成
  - 项目初始化时自动注册到全局表
  - 相关文件：SKILL.md 第三步：恢复优先 章节 / read-project-registry.mjs

- **网文平台适配场景包（P1）**
  - 新增 `webnovel` 场景包（番茄小说/起点中文网/晋江文学城）
  - 三平台交付规范：格式要求、内容风格、元数据、签约收入
  - 黄金三章模板：各章字数、要素、悬念密度标准
  - 网文特有质量规则补丁：AI味检测、节奏评分算法、注水检测
  - 平台转换规则：通用格式→番茄/起点/晋江的自动化转换指引
  - 相关文件：references/scene-packs/webnovel.md / webnovel-local-rule.md

- **降重改写预设（P1）**
  - 新增 `anti-plagiarism` 改写模式（rewrite-plan-bootstrap.mjs）
  - 六大降重策略：句式变换 / 同义词替换 / 语序调整 / 段落重组 / 修辞替换 / 数据微调
  - 降重质量自查5项：相似度≤60%、术语保留、中文通顺、无生僻词、逻辑完整
  - 联动规则：先降重 → 再去AI味 → 最后交付
  - 触发词：降重改写 / 降重 / 换一种说法 / 查重
  - 相关文件：SKILL.md 降重改写预设 章节 / rewrite-plan-bootstrap.mjs

- **预设选择流程（P1）**
  - 写小说/写网文时自动弹出预设选择卡片：通用小说 / 番茄小说 / 起点中文网 / 晋江文学城
  - 定大纲场景：有现有书稿则问为哪本书定大纲；无则先选类型再加预设选择
  - 预设写入 `.fbs/active-preset.json`，供 S3 写稿和导出阶段读取
  - `active-preset.json` 加入内部文件禁止弹出列表
  - 相关文件：SKILL.md 预设选择 章节 / README.md 预设选择流程
  - 旧 `references/scene-packs/` 中的 unused 配置已下架

- **生成后自动完成审查（P2）**
  - 最后1章写完时自动触发完成审查：字数审计 → 质量审计 → S7 AI套路检测 → 汇总报告
  - 审计通过自动进入 S4/S5，未通过列出具体问题章节
  - 追加 completion-review.json 记录审查状态
  - 相关文件：SKILL.md S3→S4 自动完成审查 章节

- **OS 自动检测 + macOS 支持（P1）**
  - 会话开始时自动检测操作系统类型（win32/darwin/linux）
  - 根据 OS 自动选择正确的重定向语法和路径分隔符
  - 检测结果写入 `.fbs/.os-detect.json`，全会话沿用
  - README 新增 macOS 支持说明
  - 相关文件：SKILL.md OS 自动检测 章节 / README.md macOS 支持

- **去AI味处理完整章节**
  - 新增完整去AI味方法论（P0规则+检查清单+替换策略+语言优化+执行流程）
  - 核心原则：保持原文体裁、论点和结构不变
  - 10种AI味模式对照表（万能开头、列表结构、空洞抒情、假数据等）
  - 6条语言优化细则（破折号控制、段落节奏、绝对化用语、空洞抒情等）
  - 相关文件：SKILL.md 去AI味处理 章节

- **S7 AI套路检测（40+种模式，计分制）**
  - 新增 `quality-auditor-lite.mjs` 的 S7 层，7个类别40+种检测模式
  - 类别：列表模板(7) / 万能开头(5) / 宏大叙事(8) / 万能过渡(11) / 空洞抒情(6) / 假数据(5) / AI冗余表达(12)
  - 计分制：命中 ≤3 处通过，≥4 处判为不通过
  - 实测效果：AI原文命中13处❌ → 优化版0处✅
  - 扩充 S4 连接词列表（加入首先/其次/最后/第一/第二/第三）

- **strip-manuscript-annotations.mjs 过程标注清理脚本**
  - 新增脚本，清理合并稿中的：HTML注释（`<!-- source: ... -->`）、章末标记（`**（第XX章完）**`）、合并元信息头、多余分隔线
  - 支持 `--toc` 参数自动生成目录
  - 加入导出工作流，列为 P0 强制步骤

- **S3入口强制预检闸门（P0）**
  - S3正式写稿前必须先执行4步预检流程：评估规模→展示时间预估→等待用户确认→确认后才可写稿
  - 禁止越过预检直接开始写稿或读取章节
  - 每次会话续写时重复预检
  - 避免AI跳过时间预估直接投入写稿
  - 相关SKILL.md位置：S3入口强制预检 章节

- **预估格式升级**
  - 新增差额显示（📈 -{欠字数} 字）
  - 新增达标/待扩充章节计数
  - 移除条件触发语气（"当≥3万字时"），改为无条件执行

- **进度报告频率规则（P0）**
  - 新增按全书字数分档的进度报告频率：S(≤5万)每章 ⏐ M(5-20万)每3章 ⏐ L(20-100万)每5-8章 ⏐ XL(>100万)每10+章
  - 更新两处进度条段落，从写死的"每完成1章报告"改为引用统一规则
  - 新增禁止行为：低于频率报告/跳过报告/中途切换
  - 相关文件：SKILL.md 进度报告频率规则 章节

- **qclaw 文件弹出过滤规则全面升级（P0）**
  - 从单方面禁止脚本输出改为内外层分类管理：内部文件（`.fbs/`、`project-config.json`、脚本、配置）禁止弹出，用户文件（章节正文、大纲、交付物）允许弹出
  - 新增禁止直接 `filesystem.read` 的文件清单表，附替代管道方案
  - 新增用户可见内容速查表，明确各场景的展示规范
  - 移除了旧的脚本白名单表（已合并到分类规则中）
  - 相关文件：SKILL.md qclaw 平台文件弹出过滤规则 章节

- **项目扫描防漏扫规则（P0）**
  - 新增「项目扫描规则」：用户问「有什么项目」时强制走 intake-router 扫描，禁止手动 filesystem.read 列目录
  - 若扫描返回 0 结果，退回到手动检查深层子目录
  - 用户说「再看看」时必须重扫
  - 相关文件：SKILL.md 项目扫描规则 章节

- **写稿前声明档位与报告频率（P0）**
  - 用户确认写稿后、AI 开始写稿前，必须声明三要素：档位、报告频率、中间章节备注规则
  - 与预估信息合并在一句话中展示，不额外增加来回
  - 原理：提前对齐预期，防止 AI 沉默写稿或过度报告
  - 相关文件：SKILL.md 步骤3.5

### 🐛 修复

- **修复S0门禁素材计数bug**
  - `countMaterialItems()` 原函数把所有列表行都算作素材（包括模板字段如`- **类型**：案例`），导致空素材库也被判定为"素材条数达标"
  - 改为只数 `MAT-\d+` 条目

- **修复导出脚本命令错误**
  - SKILL.md 中 `export-to-docx.mjs` 和 `export-to-pdf.mjs` 被误写为支持 `--book-root` 参数，实际它们只接受 `<input.md> <output.docx>` 位置参数
  - AI 照着 SKILL 跑不通就自写脚本，违反 P0 规则
  - 修正所有命令示例和参数表
  - 新增 P0 铁律：禁止自写导出/合并脚本，违者报错

- **修复时间预估被AI跳过的问题**
  - 将时间预估从S3中间位置移到S3第一条规则
  - 新增"禁止越过预检执行Read/Write/Edit"硬约束
  - 新增"不等回复就开始写稿"禁令
  - 移除"短任务直接执行不显示进度"的模糊例外

- **大批量生成支持**
  - 单章字数上限提升至 20 万字（原来 2 万字）
  - Auto-Run 分批粒度优化：每 2 章自动暂停，支持断点续生成
  - 并行度提升至 3（建议上限 5），提高生成速度
  - 分卷模式：10 万字+自动启用，每卷 30 万字
  - scale-tiers.json 新增 XL 档位支持（>200 万字）

- **项目规模自动估算**
  - 新增 `scripts/update-project-scale.mjs` 脚本
  - 从 `outline.md` 自动估算章节数和字数
  - 自动回写 `project-config.json` 的 `targetWordCount`
  - 解析并保存写作策略档位到 `.fbs/writing-strategy.json`
  - 支持 S/M/L/XL 四档位自动触发

- **分阶段测试用例**
  - 新增 `docs/TEST-CASES-PHASES.md`
  - 覆盖 S0-S6 全阶段 + OpenClaw 适配层
  - 共 45 个测试用例

### 🐛 修复

- 修复"生成 3 万字实际只有 2 万字"问题（WorkBuddy 平台步骤限制）
- `repair-expansion-plan-skeleton.mjs`：单章目标上限 20000 → 200000
- `workflow-s3-core.md`：Auto-Run 分批粒度 20 章 → 2 章
- 修复 `project-config.json` 的 `targetWordCount` 未回写导致档位判断失效
- **修复时间估算偏差 5.3 倍问题**
  - `ux-progress-enhanced.mjs`：`avgTimePerChapter` 从 2 分钟改为 0.5 分钟
  - `estimateTime`：章节/全书估算从 2/1.5 分钟/千字改为 0.5 分钟/千字
  - SKILL.md：公式从 `字数/1000×2` 改为 `字数/1000×0.5`
  - 实测 4 万字约 15 分钟，新公式消除 5 倍估算偏差
- **修复步骤爆炸导致会话卡死**
  - SKILL.md 新增单轮工具调用限制规则（≤2 个工具/轮）
  - 强制分批执行，禁止一次性读取全部章节

### 🔄 修改

- **高频脚本改造**（76 个完成）
  - 全部入口脚本接入 `UserError` 统一异常处理
  - 使用 `tryMain` 包装主函数
  - 改进控制台输出（进度显示、友好错误提示）

- **README.md 改进**
  - 新增文件结构树展示
  - 新增规模分级管理说明（S/M/L/XL 四档位）
  - 使用近似值展示（≈3万/S、≈10万/M、≈50万/L、≈200万/XL）

- **SKILL.md 改进**
  - 新增规模分级说明章节
  - 新增 `update-project-scale.mjs` 自动调用指令（S1 后自动执行）
  - 更新意图→脚本速查表

### 计划中

- [ ] OpenClaw 日志体系接入
- [ ] 功能降级策略（不支持时的优雅提示）
- [ ] 自动化测试覆盖率提升

---

## [2.1.2] - 2026-05-02

### 🎉 新增

- **OpenClaw 适配层**
  - 新增 `openclaw/fbs-bookwriter-lrz/` 目录结构
  - 新增 `skill.json`（OpenClaw 标准配置）
  - 新增 `adapter/context-mapper.mjs`（上下文映射器）
  - 新增 `adapter/result-formatter.mjs`（结果格式化器）

- **CodeBuddy 通道支持**
  - 新增 `codebuddy/channel-manifest.json`
  - 新增 `.codebuddy-plugin/plugin.json`
  - 新增 `.codebuddy/agents/*.md`（6 个 Agent 定义）
  - 新增 `.codebuddy/providers/*.yml`（14 个 Provider 配置）

- **统一异常处理系统** (`scripts/lib/user-errors.mjs`)
  - 导出 `tryMain`、`UserError`、`friendlyError`
  - 导出 `withRetry`、`RetryableError`
  - 导出 `DetailedError`、`isRetryable`、`wrapError`
  - 内置 `ERROR_SCENARIOS` 错误场景映射

- **进度追踪系统** (`scripts/lib/ux-progress-enhanced.mjs`)
  - 导出 `createProgressTracker`、`withProgress`
  - 导出 `estimateTime`、`formatTime`
  - 导出 `renderProgressBar`、`confirmLongTask`

### 🔄 修改

- **SKILL.md**
  - 修正 metadata 格式（移除 OpenClaw 混合格式）
  - 改用标准 YAML frontmatter

- **高频脚本改造**（6/43 完成）
  - `merge-chapters.mjs`：接入进度条 + UserError
  - `export-to-pdf.mjs`：接入进度条 + withRetry
  - `export-to-docx.mjs`：接入进度条 + withRetry
  - `quality-auditor.mjs`：接入进度条 + UserError
  - `session-exit.mjs`：接入友好输出 + UserError
  - `write-progress-snapshot.mjs`：接入友好输出 + UserError

- **静默执行模式**
  - `init-fbs-multiagent-artifacts.mjs` 改为默认静默模式
  - 避免在 qclaw 平台触发文档提示卡片

### 🐛 修复

- 修正 `codebuddy/channel-manifest.json` 路径（补全 `.` 前缀）
- 修正目录结构（`codebuddy/agents/` → `.codebuddy/agents/`）
- 修复 `SKILL.md` metadata 格式错误

### 📝 文档

- 新增 `openclaw/README.md`：OpenClaw 版本安装与使用说明
- 新增 `docs/DEVELOPMENT.md`：双通道开发指南与维护注意事项
- 新增 `CHANGELOG.md`：变更日志（本文档）
- 更新 `README.md`：添加 OpenClaw 安装说明

### 🔧 技术架构

- **三通道架构**
  - WorkBuddy：原生支持（YAML frontmatter）
  - OpenClaw：适配层支持（skill.json）
  - CodeBuddy：插件支持（plugin.json）

- **共享代码库**
  - `scripts/` 作为三通道共享代码库
  - 所有脚本基于入口工作目录引用

- **宿主能力检测**
  - 新增 `scripts/lib/openclaw-host-bridge.mjs`
  - 自动识别 WorkBuddy / OpenClaw / CodeBuddy
  - 静默降级（try-catch）

### ⚡ 性能优化

- 进度条只在长任务（>2 分钟）时启用
- 短任务静默执行
- 优化错误处理流程

---

## [2.1.1] - 2026-05-01

### 🎉 新增

- 支持联网查证（宿主允许时启用，离线自动降级）
- S/P/C/B 分层审校
- 中文排版优化

### 🔄 修改

- 优化意图路由逻辑
- 改进会话恢复机制

### 🐛 修复

- 修复章节合并时的编码问题
- 修复进度显示异常

---

## [2.1.0] - 2026-04-30

### 🎉 新增

- 初始版本
- 支持 S0-S6 完整写作流程
- 支持 Markdown / HTML / DOCX / PDF 导出
- 支持多场景包（genealogy, consultant, ghostwriter, ...）

---

## 版本号说明

- **MAJOR**：不兼容的 API 修改
- **MINOR**：向下兼容的功能性新增
- **PATCH**：向下兼容的问题修正

---

**福帮手出品** 📖
