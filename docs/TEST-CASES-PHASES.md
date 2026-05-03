# FBS-BookWriter-LRZ 分阶段测试用例

> 本文档包含 FBS-BookWriter v2.1.2 各阶段的完整测试用例，配合 OpenClaw 适配层使用。
> 适用版本：v2.1.2+
> 最后更新：2026-05-02

---

## 📋 测试总览

| 阶段 | 名称 | 核心脚本 | 测试用例数 |
|------|------|----------|-----------|
| S0 | 初始化 | `init-fbs-multiagent-artifacts.mjs` | 6 |
| S1 | 大纲规划 | `write-outline.mjs` | 5 |
| S2 | 素材整理 | `collect-material.mjs` | 4 |
| S3 | 内容扩写 | `expansion-workflow.mjs` | 8 |
| S4 | 润色优化 | `polish-workflow.mjs` | 5 |
| S5 | 质量审计 | `quality-auditor.mjs` | 6 |
| S6 | 导出发布 | `export-to-pdf.mjs` / `export-to-docx.mjs` | 6 |
| 适配层 | OpenClaw | `openclaw/fbs-bookwriter-lrz/index.mjs` | 5 |
| **合计** | | | **45** |

---

## 🧪 测试环境准备

### 1. 创建测试书稿目录

```bash
# 清理并创建测试环境
rm -rf /tmp/fbs-test-book
mkdir -p /tmp/fbs-test-book

# 验证目录创建成功
ls -la /tmp/fbs-test-book
```

### 2. 验证 Node.js 环境

```bash
node --version  # 需要 >= 18.0.0
```

### 3. 验证项目脚本可用性

```bash
cd /e/github/fbs-bookwriter-lrz

# 检查核心库
ls scripts/lib/user-errors.mjs
ls scripts/lib/ux-progress-enhanced.mjs

# 检查入口脚本
ls scripts/intake-router.mjs
```

---

## 📦 S0 - 初始化阶段

### 阶段说明
S0 阶段负责初始化书稿项目，创建 `.fbs/` 目录结构和配置文件。

### 测试用例

#### S0-1: 初始化新项目（中文触发）

**对话脚本（复制到 OpenClaw / WorkBuddy）：**
```
用户：帮我初始化一个新书稿项目
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/init-fbs-multiagent-artifacts.mjs --book-root /tmp/fbs-test-book --title "测试书籍" --author "测试作者"
```

**预期结果：**
```
✅ 初始化完成
📁 .fbs/ 目录已创建
📄 配置文件已生成
```

**验证命令：**
```bash
ls -la /tmp/fbs-test-book/.fbs/
cat /tmp/fbs-test-book/.fbs/config.json
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S0-2: 初始化静默模式（qclaw 平台）

**对话脚本：**
```
用户：后台初始化一个技术手册项目
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/init-fbs-multiagent-artifacts.mjs --book-root /tmp/fbs-test-book --title "技术手册" --silent
```

**预期结果：**
- 无控制台输出（静默模式）
- `.fbs/` 目录正常创建

**验证命令：**
```bash
ls /tmp/fbs-test-book/.fbs/ && echo "静默模式验证通过"
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S0-3: 初始化到已存在目录

**对话脚本：**
```
用户：重新初始化项目
```

**前置条件：** 项目已存在

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/init-fbs-multiagent-artifacts.mjs --book-root /tmp/fbs-test-book --title "新标题"
```

**预期结果：**
```
⚠️ 项目已存在
📁 .fbs/ 目录结构完整
💡 如需重新初始化，请先删除 .fbs/ 目录
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S0-4: 缺少必需参数

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/init-fbs-multiagent-artifacts.mjs
```

**预期结果：**
```
📁 文件或目录不存在
❌ 初始化失败

原因：缺少 --book-root 参数

💡 解决方案：请使用以下命令格式：
   node scripts/init-fbs-multiagent-artifacts.mjs --book-root <书稿根目录>
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S0-5: 章节状态表初始化

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/sync-chapter-status-chars.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
📊 章节状态表已更新
   - 总章节数：0
   - 已完成：0
   - 进行中：0
```

**验证命令：**
```bash
cat /tmp/fbs-test-book/.fbs/chapter-status.md
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S0-6: 进度快照写入

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/write-progress-snapshot.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
📸 进度快照已保存
   快照路径：.fbs/progress-snapshots/YYYY-MM-DD.json
```

**验证命令：**
```bash
ls /tmp/fbs-test-book/.fbs/progress-snapshots/
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

## 📋 S1 - 大纲规划阶段

### 阶段说明
S1 阶段负责根据用户需求生成书籍大纲（章节目录结构）。

### 测试用例

#### S1-1: 生成标准大纲

**对话脚本：**
```
用户：帮我规划一本关于 AI 创业的书的大纲
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz

# 先初始化
node scripts/init-fbs-multiagent-artifacts.mjs --book-root /tmp/fbs-test-book --title "AI创业指南"

# 生成大纲
node scripts/write-outline.mjs --book-root /tmp/fbs-test-book --theme "AI创业" --chapters 10
```

**预期结果：**
```
📋 大纲生成完成
   - 总章节数：10
   - 预估总字数：30,000 字
   - 预估时间：2 小时
```

**验证命令：**
```bash
cat /tmp/fbs-test-book/.fbs/outline.md
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S1-2: 指定章节数生成大纲

**对话脚本：**
```
用户：写一本8章的 Python 入门书籍大纲
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/write-outline.mjs --book-root /tmp/fbs-test-book --theme "Python入门" --chapters 8
```

**预期结果：**
```
📋 大纲生成完成
   - 总章节数：8
   - 预估总字数：24,000 字
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S1-3: 大纲导出为 JSON

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/write-outline.mjs --book-root /tmp/fbs-test-book --theme "测试主题" --chapters 5 --format json
```

**预期结果：**
```json
{
  "title": "...",
  "chapters": [
    {"index": 1, "title": "...", "targetChars": 3000},
    ...
  ]
}
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S1-4: 大纲章节数参数校验

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/write-outline.mjs --book-root /tmp/fbs-test-book --chapters 0
```

**预期结果：**
```
📁 文件或目录不存在
❌ 大纲生成失败

原因：章节数必须大于 0

💡 解决方案：请使用 --chapters <正整数>
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S1-5: 查看当前大纲

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/check-and-init-artifacts.mjs --book-root /tmp/fbs-test-book --check outline
```

**预期结果：**
```
📋 当前大纲状态
   - 大纲文件：存在
   - 章节数：X
   - 最后更新：YYYY-MM-DD HH:mm
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

## 📝 S2 - 素材整理阶段

### 阶段说明
S2 阶段负责收集和整理与书籍主题相关的素材、参考资料。

### 测试用例

#### S2-1: 创建素材目录

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
mkdir -p /tmp/fbs-test-book/materials
echo "# 素材1\n这是测试素材内容" > /tmp/fbs-test-book/materials/material-1.md
echo "# 素材2\n这是测试素材内容2" > /tmp/fbs-test-book/materials/material-2.md
```

**预期结果：**
```
📁 素材目录已创建
   - 素材数量：2
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S2-2: 素材索引生成

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/collect-material.mjs --book-root /tmp/fbs-test-book --action index
```

**预期结果：**
```
📚 素材索引已生成
   - 素材总数：2
   - 索引文件：.fbs/materials-index.json
```

**验证命令：**
```bash
cat /tmp/fbs-test-book/.fbs/materials-index.json
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S2-3: 素材关键词提取

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/collect-material.mjs --book-root /tmp/fbs-test-book --action extract-keywords
```

**预期结果：**
```
🔑 关键词提取完成
   - 提取数量：X
   - 关键词：["关键词1", "关键词2", ...]
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S2-4: 素材字数统计

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/collect-material.mjs --book-root /tmp/fbs-test-book --action stats
```

**预期结果：**
```
📊 素材统计
   - 总素材数：2
   - 总字数：XX
   - 平均每份素材：XX 字
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

## ✍️ S3 - 内容扩写阶段

### 阶段说明
S3 阶段是核心写作阶段，根据大纲逐章扩写内容。

### 测试用例

#### S3-1: 扩写单章内容

**对话脚本：**
```
用户：帮我扩写第一章
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz

# 确保有大纲
cat > /tmp/fbs-test-book/.fbs/outline.md << 'EOF'
# 测试书籍

## 第一章 测试章节

## 第二章 测试章节2
EOF

# 扩写第一章
node scripts/expansion-workflow.mjs --book-root /tmp/fbs-test-book --chapter 1 --target-chars 3000
```

**预期结果：**
```
✍️ 扩写中：第一章
[████████████████████] 100%
✅ 扩写完成
   - 章节：第一章
   - 目标字数：3,000
   - 实际字数：X,XXX
   - 耗时：X 分钟
```

**验证命令：**
```bash
wc -c /tmp/fbs-test-book/chapters/chapter-1.md
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S3-2: 长任务进度条显示

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/expansion-workflow.mjs --book-root /tmp/fbs-test-book --chapter 1 --target-chars 20000
```

**预期结果：**
```
✍️ 扩写中：第一章
[████████░░░░░░░░░░░░░] 40%  剩余约 3 分钟
```

**验证：** 进度条正确显示，百分比递增

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S3-3: 批量扩写多章

**对话脚本：**
```
用户：帮我扩写第2到第5章
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/expansion-workflow.mjs --book-root /tmp/fbs-test-book --chapters 2-5 --target-chars 3000
```

**预期结果：**
```
✍️ 批量扩写中
[████████████████████] 100%
✅ 批量扩写完成
   - 成功：4 章
   - 失败：0 章
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S3-4: 大批量扩写（Auto-Run 断点续）

**对话脚本：**
```
用户：生成10万字的书
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/expansion-workflow.mjs --book-root /tmp/fbs-test-book --chapters 1-30 --target-chars 3000 --auto-run
```

**预期结果：**
```
✍️ 大批量扩写已启动
[████████████████████] 100%
⚠️ 第一批次完成（2/30 章）
💡 进度已保存，可继续执行「继续扩写」

📊 进度报告
   - 已完成：2 章 / 30 章
   - 完成度：6.7%
   - 预估剩余时间：45 分钟
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S3-5: 断点续写

**对话脚本：**
```
用户：继续扩写
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/expansion-workflow.mjs --book-root /tmp/fbs-test-book --resume
```

**预期结果：**
```
🔄 检测到未完成项目
📊 上次进度：2/30 章
💡 是否继续？ (y/n)

[用户输入 y]

✍️ 继续扩写中（3/30 章）
...
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S3-6: 扩写字数限制修复验证

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/repair-expansion-plan-skeleton.mjs --book-root /tmp/fbs-test-book --chapter 1 --target-chars 150000
```

**预期结果：**
```
✍️ 扩写计划已生成
   - 章节：第一章
   - 目标字数：150,000（已突破旧限制 20,000）
```

**验证：** 目标字数可以超过 20000

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S3-7: 扩写门禁检查

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/expansion-gate.mjs --book-root /tmp/fbs-test-book --chapter 1
```

**预期结果：**
```
🚪 扩写门禁检查
   - 大纲检查：✅ 通过
   - 素材检查：✅ 通过
   - 状态检查：✅ 通过
✅ 门禁通过，可以开始扩写
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S3-8: 扩写进度报告

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/write-progress-snapshot.mjs --book-root /tmp/fbs-test-book --format summary
```

**预期结果：**
```
📊 书稿进度汇总
━━━━━━━━━━━━━━━━━━━━━━━━━━━
书稿名称：测试书籍
总章节数：30
已完成：5
进行中：1
待写：24
━━━━━━━━━━━━━━━━━━━━━━━━━━━
总字数：18,500 / 90,000
完成度：20.6%
预估剩余时间：5 小时
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

## ✨ S4 - 润色优化阶段

### 阶段说明
S4 阶段负责对已完成的章节进行润色、去AI味、格式优化。

### 测试用例

#### S4-1: 章节润色

**对话脚本：**
```
用户：帮我润色第一章
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz

# 创建待润色内容
cat > /tmp/fbs-test-book/chapters/chapter-1.md << 'EOF'
# 第一章 测试内容

综上所述 本文主要讨论了 测试主题。
首先 我们需要 了解 基本概念。
最后 希望 大家 能够 有所收获。
EOF

# 润色
node scripts/polish-workflow.mjs --book-root /tmp/fbs-test-book --chapter 1
```

**预期结果：**
```
✨ 润色完成：第一章
   - AI特征词替换：3 处
   - 句式优化：2 处
   - 可读性提升：15%
```

**验证命令：**
```bash
cat /tmp/fbs-test-book/chapters/chapter-1.md
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S4-2: 去AI味检查

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/audit-garble.mjs --book-root /tmp/fbs-test-book --chapter 1
```

**预期结果：**
```
🤖 AI特征检测
   - 检测到 AI 味：3 处
   - 建议改写：是

⚠️ 以下内容建议改写：
1. "综上所述" - 第3行
2. "首先...其次...最后" - 第4-5行
3. "希望...能够" - 第6行
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S4-3: 批量润色

**对话脚本：**
```
用户：批量润色前5章
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/polish-workflow.mjs --book-root /tmp/fbs-test-book --chapters 1-5
```

**预期结果：**
```
✨ 批量润色完成
   - 成功：5 章
   - 失败：0 章
   - 平均提升：12%
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S4-4: 润色门禁检查

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/polish-gate.mjs --book-root /tmp/fbs-test-book --chapter 1
```

**预期结果：**
```
🚪 润色门禁检查
   - 字数检查：✅ 通过（>2000字）
   - 状态检查：✅ 通过（已扩写）
✅ 门禁通过，可以开始润色
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S4-5: 术语一致性检查

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/audit-term-consistency.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
📝 术语一致性检查
   - 检查章节：5
   - 不一致术语：0
✅ 所有章节术语一致
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

## 🔍 S5 - 质量审计阶段

### 阶段说明
S5 阶段负责对全书进行质量检查，确保符合出版标准。

### 测试用例

#### S5-1: 完整质量审计

**对话脚本：**
```
用户：检查一下整体质量
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/quality-auditor.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
🔍 质量审计中
[████████████████████] 100%
✅ 审计完成

📊 质量报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━
整体评分：85/100
可读性：88/100 ✅
AI特征：72/100 ⚠️ 建议优化
术语一致：95/100 ✅
敏感词：100/100 ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━
问题列表：
1. 第三章 AI 味较重
2. 第一章 术语"AI"/"人工智能"混用
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S5-2: 快速质量检查

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/quality-auditor-lite.mjs --book-root /tmp/fbs-test-book --chapter 1
```

**预期结果：**
```
🔍 快速质量检查：第一章
   - 字数：✅ 3,200
   - AI味：⚠️ 中等
   - 错别字：✅ 无
整体评分：78/100
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S5-3: 断链检查

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/audit-broken-links.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
🔗 断链检查
   - 检查链接：0
   - 断链数：0
✅ 无断链问题
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S5-4: 引用格式检查

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/citation-format-check.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
📚 引用格式检查
   - 检查章节：5
   - 引用数量：0
✅ 无格式问题
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S5-5: 时间线准确性检查

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/audit-temporal-accuracy.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
⏰ 时间线准确性检查
   - 检查章节：5
   - 时间冲突：0
✅ 时间线准确
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S5-6: 健康快照

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/book-health-snapshot.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
🏥 书稿健康快照
━━━━━━━━━━━━━━━━━━━━━━━━━━━
整体健康度：92%
文件完整性：100%
状态一致性：95%
内容质量：85%
━━━━━━━━━━━━━━━━━━━━━━━━━━━
建议：优化第三章 AI 味
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

## 📤 S6 - 导出发布阶段

### 阶段说明
S6 阶段负责将书稿导出为 PDF、DOCX 等格式。

### 测试用例

#### S6-1: 合并所有章节

**对话脚本：**
```
用户：合并全稿
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/merge-chapters.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
📑 章节合并中
[████████████████████] 100%
✅ 合并完成
   - 合并章节：5
   - 总字数：18,500
   - 文件：full-manuscript.md
```

**验证命令：**
```bash
wc -l /tmp/fbs-test-book/full-manuscript.md
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S6-2: 导出为 Markdown

**对话脚本：**
```
用户：导出 Markdown
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/merge-chapters.mjs --book-root /tmp/fbs-test-book --format markdown
```

**预期结果：**
```
📄 Markdown 导出完成
   - 文件：.fbs/output.md
   - 大小：18,500 字节
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S6-3: 导出为 DOCX

**对话脚本：**
```
用户：导出 Word 文档
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/export-to-docx.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
📝 DOCX 导出中
[████████████████████] 100%
✅ 导出完成
   - 文件：.fbs/output.docx
   - 大小：XX KB
```

**验证命令：**
```bash
ls -la /tmp/fbs-test-book/.fbs/output.docx
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S6-4: 导出为 PDF

**对话脚本：**
```
用户：导出 PDF
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/export-to-pdf.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
🖨️ PDF 导出中
[████████████████████] 100%
✅ 导出完成
   - 文件：.fbs/output.pdf
   - 页数：XX 页
```

**验证命令：**
```bash
ls -la /tmp/fbs-test-book/.fbs/output.pdf
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S6-5: 导出超时重试

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
timeout 5 node scripts/export-to-pdf.mjs --book-root /tmp/fbs-test-book || echo "模拟超时"
```

**预期结果：**
```
🔄 重试中 (1/3)...
🔄 重试中 (2/3)...
🔄 重试中 (3/3)...
✅ 导出成功（重试后）
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### S6-6: 交付链检查

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node scripts/delivery-chain.mjs --book-root /tmp/fbs-test-book
```

**预期结果：**
```
🚚 交付链检查
   - PDF：✅ 已生成
   - DOCX：✅ 已生成
   - Markdown：✅ 已生成
✅ 交付物完整
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

## 🔌 OpenClaw 适配层测试

### 测试用例

#### AD-1: 技能加载验证

**对话脚本：**
```
用户：加载福帮手写作技能
```

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node openclaw/fbs-bookwriter-lrz/index.mjs --action info
```

**预期结果：**
```json
{
  "name": "fbs-bookwriter-lrz",
  "version": "2.1.2",
  "description": "福帮手长文档写作工具",
  "phases": ["S0", "S1", "S2", "S3", "S4", "S5", "S6"],
  "intents": ["写书", "出书", "定大纲", "写章节", "导出", ...]
}
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### AD-2: 上下文映射器测试

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node -e "
import('./openclaw/fbs-bookwriter-lrz/adapter/context-mapper.mjs').then(m => {
  const result = m.mapIntent('帮我写一本关于AI的书');
  console.log(JSON.stringify(result, null, 2));
});
"
```

**预期结果：**
```json
{
  "canonical": "写书",
  "phase": "S0",
  "entities": {
    "theme": "AI",
    "title": "AI书籍"
  }
}
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### AD-3: 结果格式化器测试

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node -e "
import('./openclaw/fbs-bookwriter-lrz/adapter/result-formatter.mjs').then(m => {
  const result = m.formatSuccess({
    action: '扩写',
    chapter: '第一章',
    chars: 3000,
    time: 120
  });
  console.log(result);
});
"
```

**预期结果：**
```
✍️ 扩写完成

📖 第一章
   字数：3,000 字
   耗时：2 分钟

✅ 操作成功
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### AD-4: 错误格式化测试

**直接命令执行：**
```bash
cd /e/github/fbs-bookwriter-lrz
node -e "
import('./openclaw/fbs-bookwriter-lrz/adapter/result-formatter.mjs').then(m => {
  const result = m.formatError({
    code: 'ENOENT',
    message: '文件不存在',
    path: '/tmp/test.txt'
  });
  console.log(result);
});
"
```

**预期结果：**
```
📁 文件或目录不存在

❌ 操作失败

原因：文件不存在
位置：/tmp/test.txt

💡 解决方案：...

📖 福帮手长文档写作工具 v2.1.2
```

**实际结果：** _______________

**状态：** ⏳ / ✅ / ❌

---

#### AD-5: 端到端对话测试

**对话脚本（完整流程）：**

```
用户：帮我初始化一个关于创业的书稿项目
AI：✅ 初始化完成
    📁 .fbs/ 目录已创建
    📄 书稿名称：创业指南

用户：生成10章大纲
AI：📋 大纲生成完成
    - 总章节数：10
    - 预估字数：30,000 字

用户：开始扩写第一章
AI：✍️ 扩写中：第一章
    [████████████████████] 100%
    ✅ 扩写完成（3,250 字）

用户：导出为 PDF
AI：🖨️ PDF 导出中
    [████████████████████] 100%
    ✅ 导出完成
    📄 文件：.fbs/output.pdf
```

**实际对话记录：** _______________

**状态：** ⏳ / ✅ / ❌

---

## 📊 测试结果汇总

### 执行记录

| 测试日期 | 测试人员 | 测试用例数 | 通过数 | 失败数 | 通过率 |
|---------|---------|-----------|--------|--------|--------|
| 2026-05-02 | | 45 | | | |

### 失败用例详情

| # | 测试用例 | 失败原因 | 修复建议 | 修复状态 |
|---|---------|---------|---------|---------|
| | | | | |

### 环境信息

```bash
# 记录测试环境
node --version
npm --version
git log --oneline -1
```

---

## 🚀 快速测试脚本

### 运行所有核心测试

```bash
#!/bin/bash
# test-all-phases.sh

BOOK_ROOT="/tmp/fbs-test-book"
cd /e/github/fbs-bookwriter-lrz

echo "🧪 FBS-BookWriter 全阶段测试"
echo "================================"

# S0 初始化测试
echo -e "\n📦 S0 初始化测试"
node scripts/init-fbs-multiagent-artifacts.mjs --book-root $BOOK_ROOT --title "测试书籍" 2>&1 | head -5

# S1 大纲测试
echo -e "\n📋 S1 大纲测试"
node scripts/write-outline.mjs --book-root $BOOK_ROOT --theme "测试" --chapters 5 2>&1 | head -5

# S3 扩写测试（简化版）
echo -e "\n✍️ S3 扩写测试"
node scripts/expansion-gate.mjs --book-root $BOOK_ROOT --chapter 1 2>&1 | head -5

# S5 审计测试
echo -e "\n🔍 S5 审计测试"
node scripts/quality-auditor-lite.mjs --book-root $BOOK_ROOT --chapter 1 2>&1 | head -10

# S6 导出测试
echo -e "\n📤 S6 导出测试"
node scripts/merge-chapters.mjs --book-root $BOOK_ROOT 2>&1 | head -5

echo -e "\n================================"
echo "✅ 测试完成"
```

---

**福帮手出品** 📖 | 测试让质量有保障
