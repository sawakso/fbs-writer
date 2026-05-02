#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const out = {
    bookRoot: null,
    window: 50,
    enforce: false,
    minFirstRouteRate: 90,
    minSamples: 5,
    jsonOut: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') out.bookRoot = path.resolve(argv[++i] || '');
    else if (a === '--window') out.window = Number(argv[++i] || out.window);
    else if (a === '--enforce') out.enforce = true;
    else if (a === '--min-first-route-rate') out.minFirstRouteRate = Number(argv[++i] || out.minFirstRouteRate);
    else if (a === '--min-samples') out.minSamples = Number(argv[++i] || out.minSamples);
    else if (a === '--json-out') out.jsonOut = path.resolve(argv[++i] || '');
  }
  return out;
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // ignore bad line
    }
  }
  return out;
}

function pct(n, d) {
  if (!d) return 0;
  return Number(((n / d) * 100).toFixed(2));
}

export function runPluginRoutingKpi({
  bookRoot,
  window = 50,
  enforce = false,
  minFirstRouteRate = 90,
  minSamples = 5,
  jsonOut = null,
} = {}) {
  if (!bookRoot) {
    throw new UserError('插件路由KPI', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录>',
    });
  }
  const root = path.resolve(bookRoot);
  const logPath = path.join(root, '.fbs', 'governance', 'intake-routing-kpi.jsonl');
  const rows = readJsonl(logPath).slice(-Math.max(1, Number(window) || 50));
  const total = rows.length;
  const firstRouteOk = rows.filter((x) => Number(x.firstRouteEffective) === 1).length;
  const avgTtfwSec = total
    ? Number((rows.reduce((s, x) => s + (Number(x.ttfwSeconds) || 0), 0) / total).toFixed(2))
    : 0;
  const firstRouteRate = pct(firstRouteOk, total);
  const status = total < minSamples ? 'skipped' : firstRouteRate >= minFirstRouteRate ? 'passed' : 'failed';
  const payload = {
    generatedAt: new Date().toISOString(),
    bookRoot: root,
    windowSize: total,
    thresholds: { minFirstRouteRate },
    minSamples,
    metrics: {
      firstRouteRate,
      avgTtfwSec,
    },
    status,
    source: { intakeRoutingJsonl: logPath },
  };
  const outPath = path.resolve(jsonOut || path.join(root, '.fbs', 'governance', 'plugin-routing-kpi.json'));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  const code = enforce && status === 'failed' ? 1 : 0;
  return { code, reportPath: outPath, ...payload };
}

async function main() {
  console.log('📊 插件路由KPI分析启动...');
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    throw new UserError('插件路由KPI', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录>',
    });
  }
  const out = runPluginRoutingKpi(args);
  console.log(`[plugin-routing-kpi] status=${out.status} firstRouteRate=${out.metrics?.firstRouteRate ?? 0}%`);
  console.log(`[plugin-routing-kpi] report=${out.reportPath}`);
  if (out.status === 'passed') {
    console.log('✅ 路由KPI达标');
  } else if (out.status === 'failed') {
    console.log('❌ 路由KPI未达标，首路由有效率低于阈值');
  } else {
    console.log('⏭️  样本不足，跳过KPI判定');
  }
  process.exit(out.code);
}

if (process.argv[1] && process.argv[1].endsWith('plugin-routing-kpi.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '插件路由KPI' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
