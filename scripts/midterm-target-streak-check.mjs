#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const o = { bookRoot: null, json: false, streakTarget: 3 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') o.bookRoot = path.resolve(argv[++i] || '');
    else if (a === '--json') o.json = true;
    else if (a === '--streak-target') o.streakTarget = Math.max(1, Number(argv[++i] || 3));
  }
  return o;
}

function listReports(governanceDir) {
  if (!fs.existsSync(governanceDir)) return [];
  return fs
    .readdirSync(governanceDir)
    .filter((n) => /^midterm-governance-report-\d{4}-W\d{2}\.json$/.test(n))
    .sort()
    .map((n) => path.join(governanceDir, n));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function isQualified(r) {
  const s = r?.summary || {};
  return (
    Number(s.triggerRate || 0) >= 95 &&
    Number(s.temporalRate || 0) >= 90 &&
    Number(s.resumeRate || 0) >= 90 &&
    Number(s.evidenceRate || 0) >= 95 &&
    Number(s.driftCount || 0) === 0
  );
}

export function runMidtermTargetStreakCheck({ bookRoot, streakTarget = 3 } = {}) {
  const root = path.resolve(bookRoot || process.cwd());
  const governance = path.join(root, '.fbs', 'governance');
  fs.mkdirSync(governance, { recursive: true });
  const rows = listReports(governance).map(readJson).filter(Boolean);
  let streak = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (isQualified(rows[i])) streak += 1;
    else break;
  }
  const payload = {
    schemaVersion: '1.0.0',
    domain: 'governance',
    generatedAt: new Date().toISOString(),
    bookRoot: root,
    totals: { reports: rows.length, currentStreak: streak, streakTarget },
    qualified: streak >= streakTarget,
  };
  const jsonPath = path.join(governance, 'midterm-target-streak.json');
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return { code: 0, message: 'ok', jsonPath, ...payload };
}

async function main() {
  const args = parseArgs(process.argv);

  // 参数校验
  if (!args.bookRoot) {
    throw new UserError('中期目标连续性检查', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录> [--streak-target 3] [--json]'
    });
  }

  console.log('🎯 正在检查目标连续性...');
  console.log(`   目标: ${args.streakTarget} 周达标`);

  const out = runMidtermTargetStreakCheck(args);

  if (args.json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    const streakBar = '●'.repeat(out.totals.currentStreak) + '○'.repeat(Math.max(0, out.totals.streakTarget - out.totals.currentStreak));
    console.log(`✅ 连续性检查完成`);
    console.log(`   当前连续: ${out.totals.currentStreak}/${out.totals.streakTarget} 周 [${streakBar}]`);
    console.log(`   历史报告: ${out.totals.reports} 份`);
    console.log(`   达标状态: ${out.qualified ? '✅ 已达标' : '❌ 未达标'}`);
    console.log(`   JSON: ${out.jsonPath}`);
  }

  return out.code;
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1].endsWith('midterm-target-streak-check.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '中期目标连续性检查' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
