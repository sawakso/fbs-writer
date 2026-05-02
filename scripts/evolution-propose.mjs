#!/usr/bin/env node
/**
 * P2 C1：从轨迹生成进化提案草稿（占位流水线，人工审核后合入）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserError } from './lib/user-errors.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const o = { bookRoot: null, lines: 40, help: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--book-root' && argv[i + 1]) o.bookRoot = argv[++i];
    else if (argv[i] === '--lines' && argv[i + 1]) o.lines = Number(argv[++i]) || 40;
    else if (argv[i] === '--help' || argv[i] === '-h') o.help = true;
  }
  return o;
}

function latestTraceFile(auditDir) {
  if (!fs.existsSync(auditDir)) return null;
  const files = fs.readdirSync(auditDir).filter((f) => f.startsWith('trace-') && f.endsWith('.jsonl'));
  if (!files.length) return null;
  files.sort();
  return path.join(auditDir, files[files.length - 1]);
}

function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(`用法: node scripts/evolution-propose.mjs --book-root <书稿根> [--lines 40]

读取 .fbs/audit/trace-*.jsonl 末行，写出 .fbs/evolution/proposal-<timestamp>.md 草稿`);
    return;
  }

  if (!args.bookRoot) {
    throw new UserError('进化提案', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录>'
    });
  }

  const bookRoot = path.resolve(args.bookRoot);
  console.log(`📝 开始生成进化提案...`);
  console.log(`  书稿根目录: ${bookRoot}`);

  const auditDir = path.join(bookRoot, '.fbs', 'audit');
  const tf = latestTraceFile(auditDir);
  if (!tf) {
    throw new UserError('进化提案', '未找到轨迹文件', {
      code: 'ENOENT',
      solution: '请先运行 intake-router / session-exit / record-search-preflight 生成轨迹文件'
    });
  }
  console.log(`  ✓ 找到轨迹文件: ${tf}`);
  console.log(`  ✓ 采样行数: ${args.lines}`);

  const raw = fs.readFileSync(tf, 'utf8').trim().split('\n').filter(Boolean);
  const tail = raw.slice(-args.lines);
  const evoDir = path.join(bookRoot, '.fbs', 'evolution');
  fs.mkdirSync(evoDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = path.join(evoDir, `proposal-${stamp}.md`);

  const body = [
    '# FBS 进化提案（草稿，须人工审核）',
    '',
    `> 来源轨迹: ${tf}`,
    `> 采样行数: ${tail.length}`,
    '',
    '## 原始轨迹摘录',
    '',
    '```jsonl',
    ...tail,
    '```',
    '',
    '## 建议下一步',
    '',
    '- [ ] 归因：失败/慢在哪一环节',
    '- [ ] 是否仅改 references 文档或 search-policy 配置',
    '- [ ] 跑 `npm run audit:consistency` 与 `npm run pack:skill-gates`',
    '',
  ].join('\n');

  fs.writeFileSync(out, body, 'utf8');
  console.log(`✅ 已写出进化提案: ${out}`);
}

if (process.argv[1] && process.argv[1].endsWith('evolution-propose.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '进化提案' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
