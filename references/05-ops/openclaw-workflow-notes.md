# FBS Writer 在 OpenClaw 环境下的工作流速查

> 适用环境：OpenClaw + DeepSeek + Node.js v24
> 记录时间：2026-04-30

---

## 一、安装技能

```bash
# 浅克隆（节省内存）
cd /tmp
git clone --depth 1 --single-branch https://github.com/sawakso/fbs-bookwriter-lrz.git
mv /tmp/fbs-bookwriter-lrz/fbs-bookwriter-lrz ~/.openclaw/skills/fbs-bookwriter-lrz

# 安装生产依赖（跳过 puppeteer 下载）
cd ~/.openclaw/skills/fbs-bookwriter-lrz
PUPPETEER_SKIP_DOWNLOAD=true npm install --omit=dev --no-audit --no-fund

# 环境预检
node scripts/env-preflight.mjs --json
```

**注意：** 服务器内存有限（~3.6GB），`git clone` 和 `npm install` 可能被 OOM killer 中断，加 `--depth 1` 和 `PUPPETEER_SKIP_DOWNLOAD=true` 可缓解。

---

## 二、新建书稿项目

```bash
BOOK_ROOT="/root/.openclaw/workspace/books/<项目名>"
mkdir -p "$BOOK_ROOT"

# Step 1: 意图路由
cd ~/.openclaw/skills/fbs-bookwriter-lrz
node scripts/intake-router.mjs \
  --book-root "$BOOK_ROOT" \
  --intent auto \
  --json \
  --enforce-required

# Step 2: 初始化书稿工件
node scripts/init-fbs-multiagent-artifacts.mjs --book-root "$BOOK_ROOT"
```

产出目录结构：
```
.fbs/                  ← 内部台账与过程工件
deliverables/          ← S5 对外交付区
releases/              ← S6 发布准备区
chapters/              ← 书稿章节（手工创建）
```

---

## 三、写作流程

### 3.1 填写作者元信息
```
.fbs/author-meta.md
```
包含：标题、体裁、目标读者、核心主张、字数目标、风格偏好。

### 3.2 撰写章节
章节文件放在 `chapters/` 下，如 `chapters/01-先认识南极.md`。

### 3.3 更新状态台账
```
.fbs/chapter-status.md
```
记录每章状态（大纲/完稿）、字数、备注。

---

## 四、导出

### 4.1 导出 HTML
```bash
# 用 markdown-it 将 MD 转 HTML
cd ~/.openclaw/skills/fbs-bookwriter-lrz
node -e "
import fs from 'fs';
import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({html:true,linkify:true,typographer:true});
const content = fs.readFileSync('$BOOK_ROOT/chapters/01-xxx.md','utf8');
const html = '<!DOCTYPE html>...'+md.render(content)+'...';
fs.writeFileSync('$BOOK_ROOT/chapters/01-xxx.html', html);
"
```

### 4.2 导出 DOCX
```bash
cd ~/.openclaw/skills/fbs-bookwriter-lrz
node scripts/export-to-docx.mjs \
  "$BOOK_ROOT/chapters/01-xxx.md" \
  "$BOOK_ROOT/chapters/01-xxx.docx" \
  --title "章节标题" \
  --author "作者名"
```

### 4.3 自包含预览 HTML
当需要生成一个可直接发送/预览的独立 HTML 文件（含内容切换和下载功能），可以直接编写一个完整的 HTML 文件，将渲染好的内容直接嵌入（不要用 fetch 加载），并包含切换标签和 Blob 下载脚本。

参考结构见 `~/scripts/oss/export-single-html.js`。

---

## 五、文件分发（WebChat 环境）

在 OpenClaw WebChat 中，用 `MEDIA:<本地路径>` 指令发送附件：

```markdown
MEDIA:/root/.openclaw/canvas/文件名.html
MEDIA:/root/.openclaw/canvas/文件名.docx
```

**规则：**
- `MEDIA:` 必须单独一行，前面不能有空格
- 文件路径为服务器上的绝对路径
- HTML 文件建议放在 `/root/.openclaw/canvas/` 下
- 一行一个 `MEDIA:`，可发多个附件

**各格式行为：**
| 格式 | 在 WebChat 中的行为 |
|------|-------------------|
| .html | 打开新标签页预览（带 token 认证） |
| .docx | 直接下载 |
| .html（深色主题包裹 MD） | 打开预览 markdown 源码 |

---

## 六、常见问题

### 内存不足被 SIGKILL
- `git clone` 加 `--depth 1`
- `npm install` 加 `PUPPETEER_SKIP_DOWNLOAD=true`
- 避免同时运行多个重进程

### 项目续写
重新进项目时，先跑 intake-router 检测：
```bash
node scripts/intake-router.mjs --book-root $BOOK_ROOT --intent auto --json --enforce-required
```
脚本会自动检测 `.fbs/workbuddy-resume.json` 恢复断点。

### 质量门禁
各阶段推进前需运行对应门禁脚本：
```bash
# S0 → S1
node scripts/s0-exit-gate.mjs --book-root $BOOK_ROOT --json --confirm-advance
# S3.5 扩写前
node scripts/expansion-gate.mjs --book-root $BOOK_ROOT --skill-root ~/.openclaw/skills/fbs-bookwriter-lrz
# S3.7 精修前
node scripts/polish-gate.mjs --book-root $BOOK_ROOT
```

---

## 七、脚本速查

| 用途 | 命令 |
|------|------|
| 意图路由 | `node scripts/intake-router.mjs --book-root <root> --intent auto --json` |
| 初始化项目 | `node scripts/init-fbs-multiagent-artifacts.mjs --book-root <root>` |
| 导出 DOCX | `node scripts/export-to-docx.mjs <input.md> [output.docx]` |
| 合并全稿 | `node scripts/merge-chapters.mjs --book-root <root>` |
| 质量自检 | `node scripts/quality-auditor-lite.mjs --book-root <root>` |
| 环境预检 | `node scripts/env-preflight.mjs --json` |
| 退出会话 | `node scripts/session-exit.mjs --book-root <root> --json` |
