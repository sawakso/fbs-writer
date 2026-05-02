#!/usr/bin/env node
/**
 * audit-term-consistency.mjs — 术语一致性审计脚本
 * 检查书稿中是否使用了被锁定的禁用变体术语
 */
import fs from 'fs';
import path from 'path';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const o = { bookRoot: null, chapterId: null, scanBookS3: false, enforce: false, glob: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') o.bookRoot = argv[++i];
    else if (a === '--chapter-id') o.chapterId = argv[++i];
    else if (a === '--scan-book-s3') o.scanBookS3 = true;
    else if (a === '--glob') o.glob = argv[++i];
    else if (a === '--enforce') o.enforce = true;
  }
  return o;
}

function targetFiles(bookRoot, args) {
  const root = path.resolve(bookRoot);
  const names = fs.existsSync(root) ? fs.readdirSync(root) : [];
  if (args.scanBookS3) return names.filter((n) => /^\[S3.*\.md$/i.test(n)).map((n) => path.join(root, n));
  if (args.chapterId) return names.filter((n) => n.endsWith('.md') && n.includes(args.chapterId)).map((n) => path.join(root, n));
  return names.filter((n) => n.endsWith('.md')).map((n) => path.join(root, n));
}

function parseVariantMap(lockText) {
  const map = [];
  const lines = lockText.split(/\r?\n/);
  for (const line of lines) {
    const arrow = line.match(/([^\s|`""'']+)\s*(?:->|→|=>|替换为)\s*([^\s|`""'']+)/);
    if (arrow) {
      map.push({ from: arrow[1].trim(), to: arrow[2].trim() });
      continue;
    }
    const cols = line.split('|').map((x) => x.trim()).filter(Boolean);
    if (cols.length >= 2 && cols[0] !== '禁用变体' && cols[1] !== '标准术语' && !/^[-:]+$/.test(cols[0])) {
      if (cols[0].length > 1 && cols[1].length > 1) map.push({ from: cols[0], to: cols[1] });
    }
  }
  const dedup = new Map();
  for (const item of map) dedup.set(`${item.from}=>${item.to}`, item);
  return [...dedup.values()];
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.bookRoot) {
    throw new UserError('术语一致性审计', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录>'
    });
  }

  const root = path.resolve(args.bookRoot);
  console.log('🔍 开始术语一致性审计...');
  console.log(`📁 书稿根目录: ${root}`);

  const lockFile = path.join(root, '.fbs', '术语锁定记录.md');
  if (!fs.existsSync(lockFile)) {
    console.log(`audit-term-consistency: 未找到术语锁定记录 ${lockFile}，跳过`);
    return;
  }

  const variantMap = parseVariantMap(fs.readFileSync(lockFile, 'utf8'));
  if (variantMap.length === 0) {
    console.log('audit-term-consistency: 未解析到禁用变体，跳过');
    return;
  }

  console.log(`📋 加载 ${variantMap.length} 条术语锁定规则`);

  const files = targetFiles(root, args);
  console.log(`📄 扫描 ${files.length} 个 Markdown 文件...`);

  const violations = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const pair of variantMap) {
      if (text.includes(pair.from)) {
        violations.push({ file: f, from: pair.from, to: pair.to });
      }
    }
  }

  console.log(`audit-term-consistency: 规则=${variantMap.length}, 文件=${files.length}, 违规=${violations.length}`);

  if (violations.length > 0) {
    console.log('⚠️  发现以下术语违规:');
    violations.slice(0, 30).forEach((v) => console.log(`  - ${v.file}: ${v.from} -> ${v.to}`));
    if (violations.length > 30) {
      console.log(`  ... 还有 ${violations.length - 30} 个违规未显示`);
    }
  }

  if (args.enforce && violations.length > 0) {
    throw new UserError('术语一致性审计', `发现 ${violations.length} 处术语违规`, {
      code: 'ERR_TERM_VIOLATIONS',
      details: violations.slice(0, 10)
    });
  }
}

if (process.argv[1] && process.argv[1].endsWith('audit-term-consistency.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '术语一致性审计' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
