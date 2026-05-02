#!/usr/bin/env node
/**
 * 清理 dist/：移除打包临时目录、解包复检目录；可选删除 v2.1.x 及更早分发物。
 *
 * 用法：
 *   node scripts/clean-dist.mjs [--dry-run]
 *   node scripts/clean-dist.mjs --prune-pre-211 [--dry-run]
 *
 * 默认（无 --prune-pre-211）：只删 *-temp、test-unzip、历史 extract 目录，保留所有 zip 与 *.json 报告。
 * --prune-pre-211：额外删除名称含 v210 或非 v211 主通道的 zip 及同 stem 的 *.json 报告。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserError } from './lib/user-errors.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function parseArgs(argv) {
  const o = { dryRun: false, prunePre211: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') o.dryRun = true;
    else if (argv[i] === '--prune-pre-211') o.prunePre211 = true;
  }
  return o;
}

function rmRecursive(p, dryRun) {
  if (!fs.existsSync(p)) return false;
  if (dryRun) {
    console.log(`[dry-run] 将删除: ${p}`);
    return true;
  }
  fs.rmSync(p, { recursive: true, force: true });
  console.log(`已删除: ${path.relative(ROOT, p)}`);
  return true;
}

function main() {
  const args = parseArgs(process.argv);

  console.log(`[清理构建产物] ${args.dryRun ? '[dry-run] ' : ''}开始清理 dist/ 目录...`);

  if (!fs.existsSync(DIST)) {
    console.log('[清理构建产物] dist/ 不存在，跳过');
    return;
  }

  const entries = fs.readdirSync(DIST, { withFileTypes: true });
  let removed = 0;

  for (const ent of entries) {
    const name = ent.name;
    const full = path.join(DIST, name);

    if (ent.isDirectory()) {
      const dropDir =
        name === 'test-unzip' ||
        name.endsWith('-temp') ||
        name.includes('workbuddy-extract') ||
        name.includes('extracted');
      if (dropDir) {
        if (rmRecursive(full, args.dryRun)) removed++;
      }
      continue;
    }

    if (!args.prunePre211 || !ent.isFile()) continue;

    const isOldZip =
      /^fbs-bookwriter-v210-.+\.zip$/.test(name) ||
      name === 'fbs-bookwriter-internal-team-v210.zip' ||
      name === 'fbs-bookwriter-team-handoff-v210.zip';
    const isOldReport = /^fbs-bookwriter-v210-.+\.json$/.test(name);

    if (isOldZip || isOldReport) {
      if (args.dryRun) {
        console.log(`[dry-run] 将删除文件: ${name}`);
        removed++;
      } else {
        fs.unlinkSync(full);
        console.log(`已删除: dist/${name}`);
        removed++;
      }
    }
  }

  console.log(`[清理构建产物] ✅ 完成！共处理 ${removed} 项${args.prunePre211 ? '，含 --prune-pre-211' : ''}${args.dryRun ? ' [dry-run]' : ''}`);
}

if (process.argv[1] && process.argv[1].endsWith('clean-dist.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '清理构建产物' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
