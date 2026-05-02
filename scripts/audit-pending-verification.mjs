#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const o = { bookRoot: null, enforce: false, requireLedger: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') o.bookRoot = argv[++i];
    else if (a === '--enforce') o.enforce = true;
    else if (a === '--require-ledger') o.requireLedger = true;
  }
  return o;
}


function main() {
  console.log('🔍 开始待验证项审计...');
  const args = parseArgs(process.argv);

  // 参数校验
  if (!args.bookRoot) {
    throw new UserError('待验证项审计', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录> [--enforce] [--require-ledger]'
    });
  }

  console.log(`📂 书稿根目录: ${path.resolve(args.bookRoot)}`);
  console.log('');

  const root = path.resolve(args.bookRoot);
  const candidates = [
    path.join(root, '.fbs', 'writing-notes', 'pending-verification.md'),
    path.join(root, '.fbs', 'writing-notes', '.pending-verification.md')
  ];
  const target = candidates.find(fs.existsSync);
  if (!target) {
    if (args.requireLedger || args.enforce) {
      throw new UserError('待验证项审计', '未找到待核实台账', {
        code: 'ENOENT',
        solution: '请确认 --book-root 参数正确，或创建 pending-verification.md 文件'
      });
    }
    console.log('⚠️ 未找到待核实台账，视为通过');
    process.exit(0);
  }

  console.log(`📄 文件: ${target}`);

  const text = fs.readFileSync(target, 'utf8');
  const unchecked = text.split(/\r?\n/).filter((l) => /^\s*[-*]\s*\[\s\]/.test(l));

  console.log(`📊 未核实条目: ${unchecked.length}`);

  if (unchecked.length) {
    console.log(`⚠️ 发现 ${unchecked.length} 个未核实条目:`);
    unchecked.slice(0, 20).forEach((x) => console.log(`  - ${x.trim()}`));
    if (unchecked.length > 20) {
      console.log(`  ... 还有 ${unchecked.length - 20} 条未显示`);
    }
  } else {
    console.log('✅ 所有条目都已核实');
  }

  if (args.enforce && unchecked.length > 0) {
    console.error(`❌ 发现 ${unchecked.length} 个问题，enforce 模式已开启，退出`);
    process.exit(1);
  }

  console.log(`✅ 待验证项审计完成`);
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('audit-pending-verification.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '待验证项审计' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
