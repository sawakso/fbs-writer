#!/usr/bin/env node
/**
 * fbs-cleanup.mjs — FBS 书稿清理工具
 *
 * 特性：
 * - 清理过期的缓存文件（p0-audit-report.json、gates/*.last.json）
 * - 统一异常捕获（用户友好的中文错误提示）
 * - 进度显示（显示清理进度）
 * - 支持 --dry-run 模拟运行
 *
 * 用法: node scripts/fbs-cleanup.mjs --book-root <本书根> [--dry-run] [--json]
 */
import fs from 'fs';
import path from 'path';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const args = {
    bookRoot: null,
    target: 'stale-caches',
    json: false,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root' && argv[i + 1]) args.bookRoot = path.resolve(argv[++i]);
    else if (a === '--target' && argv[i + 1]) args.target = String(argv[++i]).trim();
    else if (a === '--json') args.json = true;
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

function staleByAge(filePath, maxHours) {
  try {
    const ageMs = Date.now() - fs.statSync(filePath).mtimeMs;
    return ageMs > maxHours * 3600000;
  } catch {
    return false;
  }
}

function cleanupStaleCaches(bookRoot, dryRun) {
  const fbsDir = path.join(bookRoot, '.fbs');
  const removed = [];
  const kept = [];
  const notes = [];
  if (!fs.existsSync(fbsDir)) {
    return { removed, kept, notes: ['.fbs 不存在，跳过'] };
  }

  const p0Report = path.join(fbsDir, 'p0-audit-report.json');
  if (fs.existsSync(p0Report)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(p0Report, 'utf8'));
      const sourceReport = typeof parsed.sourceReport === 'string' ? parsed.sourceReport : null;
      const sourceExists = sourceReport ? fs.existsSync(sourceReport) : false;
      const isStale = staleByAge(p0Report, 24);
      if (isStale && (!sourceReport || !sourceExists)) {
        if (!dryRun) fs.unlinkSync(p0Report);
        removed.push(p0Report);
      } else {
        kept.push(p0Report);
      }
    } catch {
      if (staleByAge(p0Report, 24)) {
        if (!dryRun) fs.unlinkSync(p0Report);
        removed.push(p0Report);
      } else {
        kept.push(p0Report);
      }
    }
  }

  const gatesDir = path.join(fbsDir, 'gates');
  if (fs.existsSync(gatesDir)) {
    const files = fs.readdirSync(gatesDir).filter((n) => n.endsWith('.last.json'));
    for (const name of files) {
      const abs = path.join(gatesDir, name);
      if (staleByAge(abs, 72)) {
        if (!dryRun) fs.unlinkSync(abs);
        removed.push(abs);
      } else {
        kept.push(abs);
      }
    }
  }

  notes.push(`removed=${removed.length}`, `kept=${kept.length}`);
  return { removed, kept, notes };
}

function main() {
  const args = parseArgs(process.argv);

  // 参数校验
  if (!args.bookRoot) {
    throw new UserError('清理工具', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录> 指定要清理的书稿'
    });
  }
  if (args.target !== 'stale-caches') {
    throw new UserError('清理工具', `不支持的 target: ${args.target}`, {
      code: 'ERR_INVALID_ARG',
      solution: '目前仅支持 stale-caches'
    });
  }

  console.log(`\n🧹 fbs-cleanup（清理 ${args.target}）`);
  console.log(`  📂 书稿根: ${args.bookRoot}`);
  if (args.dryRun) {
    console.log('  🔍 模拟运行（不会实际删除文件）');
  }
  console.log('');

  const result = {
    target: args.target,
    bookRoot: args.bookRoot,
    dryRun: args.dryRun,
    timestamp: new Date().toISOString(),
    ...cleanupStaleCaches(args.bookRoot, args.dryRun),
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  // 友好的输出
  if (result.notes[0] === '.fbs 不存在，跳过') {
    console.log('⚠️  未找到 .fbs 目录，无需清理');
  } else {
    console.log(`  ✅ 已删除: ${result.removed.length} 个过期文件`);
    console.log(`  📌 已保留: ${result.kept.length} 个有效文件`);
  }
  console.log('');
}

main();

// 使用 tryMain 包装，支持用户友好的错误提示
if (process.argv[1] && process.argv[1].endsWith('fbs-cleanup.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '清理工具' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
