#!/usr/bin/env node
/**
 * 拆书式改写计划引导脚本（最小可执行版）
 *
 * 用法：
 *   node scripts/rewrite-plan-bootstrap.mjs --book-root <书稿根> [--mode self-upgrade|global-localization|bestseller-reframe] [--json] [--force]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

function parseArgs(argv) {
  const opts = {
    bookRoot: null,
    mode: 'self-upgrade',
    sourceTitle: '待补充',
    targetReader: '待补充',
    json: false,
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--book-root' && argv[i + 1]) opts.bookRoot = path.resolve(argv[++i]);
    else if (arg === '--mode' && argv[i + 1]) opts.mode = String(argv[++i]).trim();
    else if (arg === '--source-title' && argv[i + 1]) opts.sourceTitle = String(argv[++i]).trim();
    else if (arg === '--target-reader' && argv[i + 1]) opts.targetReader = String(argv[++i]).trim();
    else if (arg === '--json') opts.json = true;
    else if (arg === '--force') opts.force = true;
  }
  return opts;
}

function normalizeMode(mode) {
  const raw = String(mode || '').trim().toLowerCase();
  if (raw === 'self-upgrade' || raw === 'self' || raw === '自有升级') return 'self-upgrade';
  if (raw === 'global-localization' || raw === 'global' || raw === '海外落地') return 'global-localization';
  if (raw === 'bestseller-reframe' || raw === 'bestseller' || raw === '爆款改写') return 'bestseller-reframe';
  if (raw === 'anti-plagiarism' || raw === 'dedup' || raw === '降重改写' || raw === '降重') return 'anti-plagiarism';
  return 'self-upgrade';
}

function modeLabel(mode) {
  switch (mode) {
    case 'global-localization':
      return '海外内容本地化';
    case 'bestseller-reframe':
      return '爆款结构重构';
    case 'anti-plagiarism':
      return '降重改写';
    default:
      return '自有旧书升级';
  }
}

function buildTemplate({ mode, sourceTitle, targetReader }) {
  if (mode === 'anti-plagiarism') {
    return `# 降重改写计划（v1.0）

## 改写模式
- 模式ID：\`anti-plagiarism\`
- 模式说明：降重改写
- 来源作品：${sourceTitle}
- 目标读者：${targetReader}

## 来源边界与合规
- [ ] 已确认需要降重的章节范围
- [ ] 已确认改写边界（允许调整句式、同义词替换、语序调整）
- [ ] 已确认需保留的核心论点与数据

## 降重改写策略
### 句式变换（优先级最高）
- 主动句 ↔ 被动句互换
- 长句拆短句（超 40 字拆为 2-3 句）
- 短句合并（连续 ≤ 5 字短句合并）
- 因果句式重构："因为...所以..." → "...源于..."、"...关键在..."

### 同义词替换
- 高频动词/形容词替换（单章节同词复用率 > 3 次的必须替换）
- 专业术语首现保留全称，后续可交替使用全称/缩写/简称
- 避免生僻字替换（保持可读性）

### 语序调整
- 时间状语/地点状语前移或后置
- 定语从句拆分为独立句
- 引用/举例的插入位置调整

### 段落重组
- 相邻段落的观点/论据合并或对调
- 长段落（> 8 句）切分为 2-3 个短段落
- 相邻章节的过渡句重写

## 保留项
- 核心论点和数据（禁止改变含义）
- 引文和标注的原文（保留引号内原内容）
- 章节结构和逻辑顺序（不改变论述链）

## 执行节奏
- 每轮最多修改 2 章，串行推进
- 每章改完后自查：是否为原文同义复述（如 → 需再次调整）
- 全部完成后对比原文，检查是否出现含义偏差
- 如为稿件投递场景，按目标平台查重系统预期的通过率做最后微调
`;
  }

  // 默认：拆书式改写模板
  return `# 拆书式改写计划（v2.1.1）

## 改写模式
- 模式ID：\`${mode}\`
- 模式说明：${modeLabel(mode)}
- 来源作品：${sourceTitle}
- 目标读者：${targetReader}

## 来源边界与合规
- [ ] 已确认来源范围（章节 / 素材边界）
- [ ] 已确认改写边界（允许重写，不做直接复写）
- [ ] 已确认需保留的原有价值点（3-5 条）

## 改写最小清单（每项 3-5 条）
### 保留项
- 待补充

### 替换项
- 待补充

### 新增项
- 待补充

## 执行节奏（高绩效）
- 每轮最多修改 2 个文件，串行推进
- 每轮完成后执行：\`node scripts/quality-auditor-lite.mjs --book-root <bookRoot> --standalone\`
- 如进入终稿链路，发布前必须通过：\`release-governor\` + \`final-manuscript-clean-gate\`
`;
}

export function bootstrapRewritePlan(bookRoot, options = {}) {
  const mode = normalizeMode(options.mode);
  const result = {
    ok: false,
    bookRoot,
    mode,
    modeLabel: modeLabel(mode),
    planPath: path.join(bookRoot, '.fbs', 'rewrite-plan.md'),
    created: false,
    overwritten: false,
    skipped: false,
    message: '',
  };
  if (!bookRoot) {
    result.message = '缺少 --book-root';
    return result;
  }

  fs.mkdirSync(path.join(bookRoot, '.fbs'), { recursive: true });
  const exists = fs.existsSync(result.planPath);
  if (exists && !options.force) {
    result.ok = true;
    result.skipped = true;
    result.message = 'rewrite-plan 已存在；如需覆盖请追加 --force';
    return result;
  }

  const content = buildTemplate({
    mode,
    sourceTitle: options.sourceTitle || '待补充',
    targetReader: options.targetReader || '待补充',
  });
  fs.writeFileSync(result.planPath, content, 'utf8');
  result.ok = true;
  result.created = !exists;
  result.overwritten = !!exists;
  result.message = exists ? '已覆盖 rewrite-plan 模板' : '已创建 rewrite-plan 模板';
  return result;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    console.error('用法: node scripts/rewrite-plan-bootstrap.mjs --book-root <书稿根> [--mode <模式>] [--json] [--force]');
    process.exit(2);
  }
  const result = bootstrapRewritePlan(args.bookRoot, args);
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`[rewrite-plan-bootstrap] ${result.message}`);
    console.log(`[rewrite-plan-bootstrap] mode=${result.mode} file=${result.planPath}`);
  }
  process.exit(result.ok ? 0 : 2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
