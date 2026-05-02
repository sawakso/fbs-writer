# FBS-Writer 功能测试用例

> 本文档包含 FBS-Writer v2.1.2 的功能测试用例，用于验证各模块正确性。

---

## 📋 测试清单

| 模块 | 测试用例数 | 状态 |
|------|-----------|------|
| 意图识别 | 8 | ⏳ 待测试 |
| 会话管理 | 6 | ⏳ 待测试 |
| 质量审计 | 5 | ⏳ 待测试 |
| 导出功能 | 6 | ⏳ 待测试 |
| 错误处理 | 7 | ⏳ 待测试 |
| 进度追踪 | 4 | ⏳ 待测试 |
| 多平台支持 | 6 | ⏳ 待测试 |
| **合计** | **42** | ⏳ 待测试 |

---

## 1. 意图识别测试

### 1.1 测试目标

验证 `intake-router.mjs` 能正确识别用户意图，并路由到对应流程。

### 1.2 测试用例

| # | 测试场景 | 预期结果 | 实际结果 | 状态 |
|---|---------|---------|---------|------|
| 1.1 | 用户说「帮我写一本关于 AI 的白皮书」 | 正确进入 S0 初始化流程，创建 `.fbs/` 目录结构 | | ⏳ |
| 1.2 | 用户说「继续写书」 | 正确读取 `.fbs/session-resume.json`，从上次中断处继续 | | ⏳ |
| 1.3 | 用户说「写手册」 | 正确识别为 `manual` 意图，进入 S1 大纲规划 | | ⏳ |
| 1.4 | 用户说「定大纲」 | 正确识别为 `outline` 意图，调用 `write-outline.mjs` | | ⏳ |
| 1.5 | 用户说「写章节」 | 正确识别为 `write-chapter` 意图，调用 `write-chapter.mjs` | | ⏳ |
| 1.6 | 用户说「质量自检」 | 正确识别为 `quality-check` 意图，调用 `quality-auditor-lite.mjs` | | ⏳ |
| 1.7 | 用户说「导出」 | 正确识别为 `export` 意图，提示用户选择格式（PDF/DOCX/MD） | | ⏳ |
| 1.8 | 用户说「福帮手退出」 | 正确识别为 `exit` 意图，调用 `session-exit.mjs` | | ⏳ |

### 1.3 测试步骤（示例：用例 1.1）

```bash
# 1. 准备测试环境
rm -rf /tmp/test-book
mkdir /tmp/test-book

# 2. 执行意图路由
node scripts/intake-router.mjs --book-root /tmp/test-book --intent whitepaper

# 3. 验证结果
assert: 目录 /tmp/test-book/.fbs/ 已创建
assert: 文件 /tmp/test-book/.fbs/session-resume.json 已创建
assert: 输出包含「初始化完成」或类似提示
```

---

## 2. 会话管理测试

### 2.1 测试目标

验证会话退出、恢复机制正常工作。

### 2.2 测试用例

| # | 测试场景 | 预期结果 | 实际结果 | 状态 |
|---|---------|---------|---------|------|
| 2.1 | 用户说「福帮手退出」 | 正确写入恢复卡 `.fbs/session-resume.json`，提示下次可继续 | | ⏳ |
| 2.2 | 用户说「继续写书」（存在恢复卡） | 正确读取恢复卡，显示上次进度，询问是否继续 | | ⏳ |
| 2.3 | 用户说「继续写书」（不存在恢复卡） | 提示「未找到项目，请先创建」 | | ⏳ |
| 2.4 | 恢复卡 JSON 格式错误 | 抛出 `UserError`，提示「恢复卡损坏，请重新初始化」 | | ⏳ |
| 2.5 | 恢复卡指向的章节文件不存在 | 抛出 `UserError`，提示「章节文件丢失，请检查项目完整性」 | | ⏳ |
| 2.6 | 用户说「放弃当前项目」 | 删除 `.fbs/` 目录，清空项目状态 | | ⏳ |

### 2.3 测试步骤（示例：用例 2.1）

```bash
# 1. 准备测试环境（已有项目）
mkdir -p /tmp/test-book/.fbs
echo '{"currentChapter": "chapter-1.md", "progress": 50}' > /tmp/test-book/.fbs/session-resume.json

# 2. 执行退出
node scripts/session-exit.mjs --book-root /tmp/test-book --json

# 3. 验证结果
assert: 退出状态码为 0
assert: .fbs/session-resume.json 包含最新进度
assert: 输出为 JSON 格式（因为指定了 --json）
```

---

## 3. 质量审计测试

### 3.1 测试目标

验证质量审计脚本能正确检测问题并生成报告。

### 3.2 测试用例

| # | 测试场景 | 预期结果 | 实际结果 | 状态 |
|---|---------|---------|---------|------|
| 3.1 | 用户说「检查一下质量」 | 正确调用质检脚本，返回格式化质检报告 | | ⏳ |
| 3.2 | 章节包含 AI 特征词（如「综上所述」） | 检测到 AI 味，报告标注「建议改写」 | | ⏳ |
| 3.3 | 章节字数不达标（< 2000 字） | 报告标注「字数不足」 | | ⏳ |
| 3.4 | 章节包含敏感词 | 报告标注「敏感内容」，列出具体词汇 | | ⏳ |
| 3.5 | 项目不存在 | 抛出 `UserError`，提示「项目不存在，请先创建」 | | ⏳ |

### 3.3 测试步骤（示例：用例 3.1）

```bash
# 1. 准备测试环境（已有项目 + 章节）
mkdir -p /tmp/test-book/chapters
echo "这是测试章节内容，" > /tmp/test-book/chapters/chapter-1.md
for i in {1..500}; do echo -n "测试内容 " >> /tmp/test-book/chapters/chapter-1.md; done

# 2. 执行质量审计
node scripts/quality-auditor-lite.mjs --book-root /tmp/test-book

# 3. 验证结果
assert: 输出包含「质量评分」
assert: 输出包含「问题列表」（如有）
assert: 退出状态码为 0
```

---

## 4. 导出功能测试

### 4.1 测试目标

验证导出脚本能正确生成 PDF/DOCX/Markdown 文件。

### 4.2 测试用例

| # | 测试场景 | 预期结果 | 实际结果 | 状态 |
|---|---------|---------|---------|------|
| 4.1 | 用户说「导出 PDF」 | 正确生成 PDF 文件，路径为 `.fbs/output.pdf` | | ⏳ |
| 4.2 | 用户说「导出 Word」 | 正确生成 DOCX 文件，路径为 `.fbs/output.docx` | | ⏳ |
| 4.3 | 用户说「合并全稿」 | 正确合并所有章节，生成 `full-manuscript.md` | | ⏳ |
| 4.4 | PDF 导出时 puppeteer 未安装 | 抛出 `UserError`，提示「请先安装 puppeteer」 | | ⏳ |
| 4.5 | DOCX 导出时 html-to-docx 未安装 | 抛出 `UserError`，提示「请先安装 html-to-docx」 | | ⏳ |
| 4.6 | 合并全稿时章节文件缺失 | 抛出 `UserError`，提示「章节文件不完整」 | | ⏳ |

### 4.3 测试步骤（示例：用例 4.3）

```bash
# 1. 准备测试环境（已有多个章节）
mkdir -p /tmp/test-book/chapters
echo "# 第一章" > /tmp/test-book/chapters/chapter-1.md
echo "# 第二章" > /tmp/test-book/chapters/chapter-2.md

# 2. 执行合并
node scripts/merge-chapters.mjs --book-root /tmp/test-book

# 3. 验证结果
assert: 文件 /tmp/test-book/full-manuscript.md 已创建
assert: 文件内容包含「第一章」和「第二章」
assert: 退出状态码为 0
```

---

## 5. 错误处理测试

### 5.1 测试目标

验证 `user-errors.mjs` 能正确捕获错误并生成友好提示。

### 5.2 测试用例

| # | 测试场景 | 预期结果 | 实际结果 | 状态 |
|---|---------|---------|---------|------|
| 5.1 | 脚本执行时文件不存在（ENOENT） | 抛出 `UserError`，显示友好错误 + 建议解决方案 | | ⏳ |
| 5.2 | 脚本执行时缺少参数（ERR_MISSING_ARGS） | 抛出 `UserError`，显示「缺少必需参数：xxx」 | | ⏳ |
| 5.3 | 脚本执行时依赖缺失（MODULE_NOT_FOUND） | 抛出 `UserError`，显示「缺少依赖：xxx，请执行 npm install」 | | ⏳ |
| 5.4 | 脚本执行时网络连接失败（ECONNREFUSED） | 抛出 `UserError`，显示「网络连接失败，请检查网络」 | | ⏳ |
| 5.5 | 脚本执行时超时（ETIMEDOUT） | 抛出 `UserError`，显示「操作超时，请重试」 | | ⏳ |
| 5.6 | 使用 `withRetry` 包装的函数失败 3 次 | 自动重试 3 次，全部失败后抛出 `UserError` | | ⏳ |
| 5.7 | 未捕获的异常 | `tryMain()` 捕获异常，转换为 `UserError` 格式输出 | | ⏳ |

### 5.3 测试步骤（示例：用例 5.1）

```bash
# 1. 准备测试环境（不创建配置文件）
rm -f /tmp/test-book/.fbs/env.json

# 2. 执行脚本（依赖配置文件）
node -e "
import('./scripts/lib/user-errors.mjs').then(m => {
  try {
    require('fs').readFileSync('/nonexistent/file.txt');
  } catch (err) {
    throw new m.UserError('配置文件不存在', 'ENOENT', { path: '/nonexistent/file.txt' });
  }
});
"

# 3. 验证结果
assert: 输出包含 emoji（📁）
assert: 输出包含错误标题
assert: 输出包含建议解决方案
assert: 退出状态码非 0
```

---

## 6. 进度追踪测试

### 6.1 测试目标

验证 `ux-progress-enhanced.mjs` 能正确显示进度条和估算剩余时间。

### 6.2 测试用例

| # | 测试场景 | 预期结果 | 实际结果 | 状态 |
|---|---------|---------|---------|------|
| 6.1 | 长任务（> 2 分钟）执行 | 显示 ASCII 进度条 + 预估剩余时间 | | ⏳ |
| 6.2 | 短任务（< 2 分钟）执行 | 静默执行，不显示进度条 | | ⏳ |
| 6.3 | 任务完成 | 进度条显示 100%，显示「完成」消息 | | ⏳ |
| 6.4 | 任务失败 | 进度条中断，显示错误信息 | | ⏳ |

### 6.3 测试步骤（示例：用例 6.1）

```bash
# 1. 准备测试脚本（模拟长任务）
cat > /tmp/test-progress.mjs << 'EOF'
import { createProgressTracker } from './scripts/lib/ux-progress-enhanced.mjs';

const progress = createProgressTracker(100);

for (let i = 0; i <= 100; i += 10) {
  progress.update(i);
  // 模拟耗时操作
  const start = Date.now();
  while (Date.now() - start < 100) {}
}

progress.done();
EOF

# 2. 执行测试
node /tmp/test-progress.mjs

# 3. 验证结果
assert: 输出包含 ASCII 进度条（[=====>    ]）
assert: 输出包含百分比（如 50%）
assert: 输出包含预估剩余时间（如「剩余 2 分钟」）
```

---

## 7. 多平台支持测试

### 7.1 测试目标

验证 WorkBuddy / OpenClaw / CodeBuddy 三平台都能正确识别和执行。

### 7.2 测试用例

| # | 测试场景 | 预期结果 | 实际结果 | 状态 |
|---|---------|---------|---------|------|
| 7.1 | WorkBuddy 导入技能 | 正确读取 `SKILL.md`，显示触发词和意图菜单 | | ⏳ |
| 7.2 | OpenClaw 导入技能 | 正确读取 `openclaw/fbs-bookwriter-lrz/skill.json`，显示技能信息 | | ⏳ |
| 7.3 | CodeBuddy 导入插件 | 正确读取 `.codebuddy-plugin/plugin.json`，显示插件信息 | | ⏳ |
| 7.4 | WorkBuddy 执行脚本 | 脚本正常执行，输出抑制规则生效（无原始 stdout） | | ⏳ |
| 7.5 | OpenClaw 执行脚本 | 脚本正常执行，适配层正确格式化结果 | | ⏳ |
| 7.6 | CodeBuddy 执行脚本 | 脚本正常执行，Agent 正确调用 Provider | | ⏳ |

### 7.3 测试步骤（示例：用例 7.1）

```bash
# 1. 在 WorkBuddy 中导入技能
# （手动操作）打开 WorkBuddy → 技能管理 → 本地安装 → 选择 E:/github/fbs-bookwriter-lrz/

# 2. 验证导入成功
assert: WorkBuddy 显示技能名称「福帮手长文档写作工具」
assert: WorkBuddy 显示触发词列表（写书、出书、写手册...）
assert: WorkBuddy 显示场景包（general, genealogy, consultant...）

# 3. 测试执行
# （手动操作）对 WorkBuddy 说「写书」
assert: WorkBuddy 正确进入 S0 初始化流程
```

---

## 📝 测试报告模板

```markdown
## 测试执行记录

**测试日期**：YYYY-MM-DD
**测试人员**：
**测试版本**：v2.1.2
**测试环境**：Windows 11 / macOS / Linux

### 测试结果汇总

| 模块 | 通过 | 失败 | 跳过 | 通过率 |
|------|------|------|------|--------|
| 意图识别 | 8 | 0 | 0 | 100% |
| 会话管理 | 5 | 1 | 0 | 83.3% |
| ... | ... | ... | ... | ... |

### 失败用例详情

| # | 测试用例 | 失败原因 | 修复建议 |
|---|---------|---------|---------|
| 2.4 | 恢复卡 JSON 格式错误 | 未捕获 SyntaxError | 在 `session-resume.mjs` 中添加 try-catch |

### 建议

1. 修复失败用例（2.4, 4.4）
2. 增加单元测试覆盖率
3. 增加集成测试自动化脚本
```

---

## 🚀 自动化测试（可选）

### 运行所有测试

```bash
# 意图识别测试
node tests/intent-recognition.test.mjs

# 会话管理测试
node tests/session-management.test.mjs

# 质量审计测试
node tests/quality-audit.test.mjs

# 导出功能测试
node tests/export.test.mjs

# 错误处理测试
node tests/error-handling.test.mjs

# 进度追踪测试
node tests/progress-tracking.test.mjs

# 多平台测试（需要手动在各平台执行）
# 见上文 7.3 测试步骤
```

---

**福帮手出品** 📖 | 测试让质量有保障
