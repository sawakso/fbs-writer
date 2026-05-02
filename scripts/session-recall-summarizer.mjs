#!/usr/bin/env node
import { UserError } from './lib/user-errors.mjs';
import fs from 'fs';
import path from 'path';

function parseArgs(argv) {
  const out = { bookRoot: null, query: '', jsonOut: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') out.bookRoot = path.resolve(argv[++i] || '');
    else if (a === '--query') out.query = String(argv[++i] || '');
    else if (a === '--json-out') out.jsonOut = path.resolve(argv[++i] || '');
  }
  return out;
}

function readTextSafe(abs) {
  try {
    return fs.readFileSync(abs, 'utf8');
  } catch {
    return '';
  }
}

function clip(s, n = 140) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function collectCandidates(bookRoot) {
  const files = [];
  const fbs = path.join(bookRoot, '.fbs');
  const direct = ['session-resume.json', 'memory-brief.md', 'chapter-status.md'];
  for (const rel of direct) {
    const abs = path.join(fbs, rel);
    if (fs.existsSync(abs)) files.push(abs);
  }
  const reports = path.join(fbs, 'reports');
  if (fs.existsSync(reports)) {
    const rows = fs
      .readdirSync(reports)
      .map((x) => path.join(reports, x))
      .filter((x) => fs.statSync(x).isFile())
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
      .slice(0, 8);
    files.push(...rows);
  }
  return files;
}

export function runSessionRecallSummarizer({ bookRoot, query = '', jsonOut = null } = {}) {
  if (!bookRoot) {
    throw new UserError('会话回忆摘要', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录> [--query <关键词>] [--json-out <输出路径>]'
    });
  }

  const root = path.resolve(bookRoot);
  if (!fs.existsSync(root)) {
    throw new UserError('会话回忆摘要', `书稿根目录不存在: ${root}`, {
      code: 'ERR_BOOK_ROOT_NOT_FOUND',
      solution: '请确认 --book-root 指向有效的书稿目录'
    });
  }

  console.log(`[session-recall-summarizer] 开始收集会话回忆信息，书稿根目录: ${root}`);
  const q = String(query || '').trim().toLowerCase();
  if (q) {
    console.log(`[session-recall-summarizer] 查询关键词: "${q}"`);
  }

  const candidates = collectCandidates(root);
  console.log(`[session-recall-summarizer] 发现 ${candidates.length} 个候选文件，正在扫描...`);

  const hits = [];
  for (const abs of candidates) {
    const text = readTextSafe(abs);
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (!q) {
      hits.push({ file: rel, excerpt: clip(lines.find((x) => x.trim()) || '') });
      continue;
    }
    const hitLine = lines.find((x) => x.toLowerCase().includes(q));
    if (hitLine) hits.push({ file: rel, excerpt: clip(hitLine) });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    bookRoot: root,
    query: query || null,
    hitCount: hits.length,
    summary: hits.slice(0, 6).map((h, i) => `${i + 1}. [${h.file}] ${h.excerpt}`),
    evidence: hits.slice(0, 12),
  };
  const outPath = path.resolve(jsonOut || path.join(root, '.fbs', 'session-recall-summary.json'));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`[session-recall-summarizer] 命中 ${hits.length} 条记录`);
  console.log(`[session-recall-summarizer] 报告已保存到: ${outPath}`);

  return { code: 0, reportPath: outPath, ...payload };
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(`[session-recall-summarizer] 开始执行会话回忆摘要任务...`);
  const out = runSessionRecallSummarizer(args);
  console.log(`[session-recall-summarizer] 会话回忆摘要完成！`);
}

if (process.argv[1] && process.argv[1].endsWith('session-recall-summarizer.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '会话回忆摘要' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
