#!/usr/bin/env node
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
  if (args.scanBookS3) {
    return names.filter((n) => /^\[S3.*\.md$/i.test(n)).map((n) => path.join(root, n));
  }
  if (args.chapterId) {
    return names.filter((n) => n.endsWith('.md') && n.includes(args.chapterId)).map((n) => path.join(root, n));
  }
  return names.filter((n) => n.endsWith('.md')).map((n) => path.join(root, n));
}

function main() {
  console.log('🔍 开始时间准确性审计...');
  const args = parseArgs(process.argv);

  // 参数校验
  if (!args.bookRoot) {
    throw new UserError('时间准确性审计', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录> [--scan-book-s3] [--chapter-id <ID>] [--enforce]'
    });
  }

  console.log(`📂 书稿根目录: ${path.resolve(args.bookRoot)}`);
  if (args.chapterId) console.log(`📑 章节ID: ${args.chapterId}`);
  if (args.scanBookS3) console.log(`📊 扫描模式: S3章节`);
  console.log('');

  const files = targetFiles(args.bookRoot, args);
  if (files.length === 0) {
    console.log('⚠️ 无匹配文件，跳过');
    process.exit(0);
  }

  console.log(`📊 正在检查 ${files.length} 个文件...`);
  const yearRe = /\b(19|20)\d{2}\b/g;
  const sourceHint = /(MAT-\d+|\[[0-9]+\]|https?:\/\/|来源|出处|\[\[时间:[^\]]+\]\])/;
  const violations = [];

  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (!yearRe.test(line)) return;
      yearRe.lastIndex = 0;
      if (!sourceHint.test(line)) {
        violations.push({ file: f, line: idx + 1, text: line.trim().slice(0, 120) });
      }
    });
  }

  console.log(`📊 检查完成: 文件=${files.length}, 违规=${violations.length}`);

  if (violations.length) {
    console.log(`⚠️ 发现 ${violations.length} 处时间引用缺少来源:`);
    violations.slice(0, 30).forEach((v) => console.log(`  - ${v.file}:${v.line} ${v.text}`));
    if (violations.length > 30) {
      console.log(`  ... 还有 ${violations.length - 30} 处未显示`);
    }
  } else {
    console.log('✅ 所有时间引用都已包含来源');
  }

  if (args.enforce && violations.length > 0) {
    console.error(`❌ 发现 ${violations.length} 个问题，enforce 模式已开启，退出`);
    process.exit(1);
  }

  console.log(`✅ 时间准确性审计完成`);
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('audit-temporal-accuracy.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '时间准确性审计' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
