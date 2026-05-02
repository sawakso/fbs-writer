#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const out = { bookRoot: null, jsonOut: null, enforce: false, maxTtfwSec: 10, minFirstPassRate: 60 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') out.bookRoot = path.resolve(argv[++i] || '');
    else if (a === '--json-out') out.jsonOut = path.resolve(argv[++i] || '');
    else if (a === '--enforce') out.enforce = true;
    else if (a === '--max-ttfw-sec') out.maxTtfwSec = Number(argv[++i] || out.maxTtfwSec);
    else if (a === '--min-first-pass-rate') out.minFirstPassRate = Number(argv[++i] || out.minFirstPassRate);
  }
  return out;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

export function runNorthstarKpi({
  bookRoot,
  jsonOut = null,
  enforce = false,
  maxTtfwSec = 10,
  minFirstPassRate = 60,
} = {}) {
  if (!bookRoot) return { code: 2, message: 'missing --book-root' };
  const root = path.resolve(bookRoot);
  const routing = readJson(path.join(root, '.fbs', 'governance', 'plugin-routing-kpi.json'), {});
  const quality = readJson(path.join(root, '.fbs', 'quality-full-last.json'), {});
  const overall = quality?.bookQualityConclusion?.overallStatus || 'unknown';
  const firstPassRate = overall === 'pass' ? 100 : overall === 'warn' ? 60 : overall === 'fail' ? 0 : 0;
  const ttfwSec = Number(routing?.metrics?.avgTtfwSec || 0);
  const hasQuality = overall !== 'unknown';
  const hasRouting = ['passed', 'failed'].includes(String(routing?.status || '').toLowerCase());
  const status = !hasQuality || !hasRouting ? 'skipped' : ttfwSec <= maxTtfwSec && firstPassRate >= minFirstPassRate ? 'passed' : 'warn';
  const payload = {
    generatedAt: new Date().toISOString(),
    bookRoot: root,
    thresholds: { maxTtfwSec, minFirstPassRate },
    northstar: {
      ttfwSec,
      firstPassRate,
      qualityOverallStatus: overall,
    },
    source: {
      pluginRoutingKpi: path.join(root, '.fbs', 'governance', 'plugin-routing-kpi.json'),
      qualityFull: path.join(root, '.fbs', 'quality-full-last.json'),
    },
    status,
  };
  const outPath = path.resolve(jsonOut || path.join(root, '.fbs', 'governance', 'northstar-kpi.json'));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  const code = enforce && status === 'warn' ? 1 : 0;
  return { code, reportPath: outPath, ...payload };
}

async function main() {
  const args = parseArgs(process.argv);

  // 参数校验
  if (!args.bookRoot) {
    throw new UserError('北极星KPI', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录> [--enforce] [--max-ttfw-sec 10] [--min-first-pass-rate 60]'
    });
  }

  console.log('⭐ 正在计算北极星KPI...');
  console.log(`   TTfW 阈值: ≤${args.maxTtfwSec}秒`);
  console.log(`   首次通过率阈值: ≥${args.minFirstPassRate}%`);

  const out = runNorthstarKpi(args);

  if (args.json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    const statusIcon = out.status === 'passed' ? '✅' : out.status === 'warn' ? '⚠️' : '⏭️';
    const statusText = out.status === 'passed' ? '通过' : out.status === 'warn' ? '警告' : '跳过';
    console.log(`✅ 北极星KPI计算完成`);
    console.log(`   状态: ${statusIcon} ${statusText}`);
    console.log(`   TTfW: ${out.northstar?.ttfwSec ?? 0}秒 (阈值 ≤${args.maxTtfwSec}秒)`);
    console.log(`   首次通过率: ${out.northstar?.firstPassRate ?? 0}% (阈值 ≥${args.minFirstPassRate}%)`);
    console.log(`   报告: ${out.reportPath}`);
  }

  return out.code;
}

if (process.argv[1] && process.argv[1].endsWith('northstar-kpi.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '北极星KPI' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
