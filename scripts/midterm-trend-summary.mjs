#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const o = { bookRoot: null, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') o.bookRoot = path.resolve(argv[++i] || '');
    else if (a === '--json') o.json = true;
  }
  return o;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function listGovernanceReports(governanceDir) {
  if (!fs.existsSync(governanceDir)) return [];
  return fs
    .readdirSync(governanceDir)
    .filter((n) => /^midterm-governance-report-\d{4}-W\d{2}\.json$/.test(n))
    .sort()
    .map((n) => path.join(governanceDir, n));
}

function trend(values = []) {
  if (values.length < 2) return 'flat';
  const d = values[values.length - 1] - values[values.length - 2];
  if (d > 0) return 'up';
  if (d < 0) return 'down';
  return 'flat';
}

export function runMidtermTrendSummary({ bookRoot } = {}) {
  const root = path.resolve(bookRoot || process.cwd());
  const governance = path.join(root, '.fbs', 'governance');
  fs.mkdirSync(governance, { recursive: true });
  const files = listGovernanceReports(governance);
  const rows = files.map((f) => readJson(f, null)).filter(Boolean);
  const trigger = rows.map((r) => Number(r.summary?.triggerRate || 0));
  const temporal = rows.map((r) => Number(r.summary?.temporalRate || 0));
  const evidence = rows.map((r) => Number(r.summary?.evidenceRate || 0));
  const drift = rows.map((r) => Number(r.summary?.driftCount || 0));
  const recurrence = {};
  for (const r of rows) {
    for (const risk of r.risks || []) {
      const key = String(risk).slice(0, 40);
      recurrence[key] = (recurrence[key] || 0) + 1;
    }
  }
  const payload = {
    schemaVersion: '1.0.0',
    domain: 'governance',
    generatedAt: new Date().toISOString(),
    bookRoot: root,
    totals: { reports: rows.length },
    metrics: {
      trigger: { current: trigger.at(-1) || 0, trend: trend(trigger) },
      temporal: { current: temporal.at(-1) || 0, trend: trend(temporal) },
      evidence: { current: evidence.at(-1) || 0, trend: trend(evidence) },
      drift: { current: drift.at(-1) || 0, trend: trend(drift) },
    },
    recurrenceTop: Object.entries(recurrence)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([riskKey, count]) => ({ riskKey, count })),
  };
  const jsonPath = path.join(governance, 'midterm-trend-summary.json');
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return { code: 0, message: 'ok', jsonPath, ...payload };
}

async function main() {
  const args = parseArgs(process.argv);

  // 参数校验
  if (!args.bookRoot) {
    throw new UserError('中期趋势摘要', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录> [--json]'
    });
  }

  console.log('📈 正在生成中期趋势摘要...');

  const out = runMidtermTrendSummary(args);

  if (args.json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    const trendIcon = (t) => t === 'up' ? '📈' : t === 'down' ? '📉' : '➡️';
    console.log(`✅ 趋势摘要生成完成`);
    console.log(`   历史报告: ${out.totals.reports} 份`);
    console.log(`   触发自动化率: ${out.metrics.trigger.current}% ${trendIcon(out.metrics.trigger.trend)}`);
    console.log(`   时态可信率: ${out.metrics.temporal.current}% ${trendIcon(out.metrics.temporal.trend)}`);
    console.log(`   证据完备率: ${out.metrics.evidence.current}% ${trendIcon(out.metrics.evidence.trend)}`);
    console.log(`   JSON: ${out.jsonPath}`);
  }

  return out.code;
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1].endsWith('midterm-trend-summary.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '中期趋势摘要' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
