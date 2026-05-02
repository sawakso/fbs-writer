#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const o = { skillRoot: process.cwd(), bookRoot: null, enforce: false, requireLedger: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skill-root') o.skillRoot = argv[++i];
    else if (a === '--book-root') o.bookRoot = argv[++i];
    else if (a === '--enforce') o.enforce = true;
    else if (a === '--require-ledger') o.requireLedger = true;
  }
  return o;
}


function main() {
  console.log('🔍 开始查询优化审计...');
  const args = parseArgs(process.argv);

  // 参数校验
  if (!args.bookRoot) {
    throw new UserError('查询优化审计', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录> [--enforce] [--require-ledger]'
    });
  }

  console.log(`📂 书稿根目录: ${path.resolve(args.bookRoot)}`);
  console.log('');

  const ledger = path.join(path.resolve(args.bookRoot), '.fbs', 'search-ledger.jsonl');
  if (!fs.existsSync(ledger)) {
    if (args.requireLedger || args.enforce) {
      throw new UserError('查询优化审计', `未找到账本 ${ledger}`, {
        code: 'ENOENT',
        solution: '请确认 --book-root 参数正确，或先运行搜索脚本生成账本'
      });
    }
    console.log(`⚠️ 未找到账本 ${ledger}，跳过`);
    process.exit(0);
  }

  console.log(`📊 正在分析账本: ${ledger}`);
  let total = 0;
  const missing = [];

  for (const [idx, line] of lines.entries()) {
    try {
      const row = JSON.parse(line);
      if (row.kind !== 'search' || row.ok === false) continue;
      total += 1;
      const q = row.queryOptimization;
      if (!q || (typeof q === 'string' && !q.trim())) {
        missing.push({ line: idx + 1, stage: row.stage || row.workflowStage || 'unknown', query: row.query || '' });
      }
    } catch {
      // ignore invalid lines
    }
  }

  console.log(`📊 搜索记录: ${total}, 缺失 queryOptimization: ${missing.length}`);

  if (missing.length) {
    console.log(`⚠️ 发现 ${missing.length} 条记录缺失 queryOptimization:`);
    for (const m of missing.slice(0, 20)) {
      console.log(`  - 第 ${m.line} 行 [${m.stage}] ${m.query}`);
    }
    if (missing.length > 20) {
      console.log(`  ... 还有 ${missing.length - 20} 条未显示`);
    }
  } else {
    console.log('✅ 所有搜索记录都已包含 queryOptimization');
  }

  if (args.enforce && missing.length > 0) {
    console.error(`❌ 发现 ${missing.length} 个问题，enforce 模式已开启，退出`);
    process.exit(1);
  }

  console.log(`✅ 查询优化审计完成`);
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('audit-query-optimization.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '查询优化审计' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
