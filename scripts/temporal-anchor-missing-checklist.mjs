#!/usr/bin/env node
/**
 * 时间锚点缺失检查清单：扫描书稿中含时间敏感词但缺少时间锚点的行。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const o = { bookRoot: null, enforce: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') o.bookRoot = path.resolve(argv[++i] || '');
    else if (a === '--enforce') o.enforce = true;
    else if (a === '--json') o.json = true;
  }
  return o;
}

function needsCheck(line) {
  return /最新|当前|目前|今年|截至|as of|latest|current|\b(19|20)\d{2}\b/i.test(line);
}

function hasAnchor(line) {
  return /\[\[时间:[^\]]+\]\]|https?:\/\/|来源|出处|MAT-\d+/i.test(line);
}

export function runTemporalAnchorMissingChecklist({ bookRoot, enforce = false } = {}) {
  const root = path.resolve(bookRoot || process.cwd());
  const governance = path.join(root, '.fbs', 'governance');
  fs.mkdirSync(governance, { recursive: true });

  console.log('[temporal-checklist] 正在扫描书稿中的时间敏感行...');
  const files = globSync('**/*.md', {
    cwd: root,
    absolute: true,
    nodir: true,
    ignore: ['**/.fbs/**', '**/node_modules/**', '**/dist/**'],
  });
  const checklist = [];
  for (const file of files) {
    let text = '';
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (!needsCheck(line)) return;
      if (hasAnchor(line)) return;
      checklist.push({
        file,
        line: idx + 1,
        issue: 'temporal_anchor_missing',
        snippet: line.trim().slice(0, 120),
        fixHint: '补充 [[时间:YYYY-MM-DD]] 与来源链接/出处',
      });
    });
  }
  console.log(`[temporal-checklist] 扫描完成: ${files.length} 个文件, 发现 ${checklist.length} 处缺失`);

  const payload = {
    schemaVersion: '1.0.0',
    domain: 'governance',
    generatedAt: new Date().toISOString(),
    bookRoot: root,
    totals: { filesScanned: files.length, missingAnchors: checklist.length },
    checklist,
  };
  const jsonPath = path.join(governance, 'temporal-anchor-missing-checklist.json');
  const mdPath = path.join(governance, 'temporal-anchor-missing-checklist.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  const mdLines = ['# Temporal Anchor Missing Checklist', '', `- missingAnchors: ${checklist.length}`, ''];
  for (const item of checklist.slice(0, 200)) mdLines.push(`- ${item.file}:${item.line} ${item.snippet}`);
  fs.writeFileSync(mdPath, `${mdLines.join('\n')}\n`, 'utf8');
  console.log(`[temporal-checklist] 已写入: ${jsonPath}, ${mdPath}`);
  return { code: enforce && checklist.length > 0 ? 1 : 0, message: 'ok', jsonPath, mdPath, ...payload };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    throw new UserError('时间锚点缺失检查', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录> [--enforce] [--json]'
    });
  }
  const out = runTemporalAnchorMissingChecklist(args);
  if (args.json) console.log(JSON.stringify(out, null, 2));
  else console.log(`[temporal-checklist] missing=${out.totals.missingAnchors} files=${out.totals.filesScanned}`);
  process.exit(out.code);
}

if (process.argv[1] && process.argv[1].endsWith('temporal-anchor-missing-checklist.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '时间锚点缺失检查' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
