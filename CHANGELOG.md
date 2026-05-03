# 变更日志

本文档记录 FBS-Writer 的所有 notable changes，格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 🎉 新增

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
