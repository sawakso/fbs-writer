#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserError } from './lib/user-errors.mjs';
import { getIsoWeekLabel } from './book-state-weekly-export.mjs';
import { runMidtermTrendSummary } from './midterm-trend-summary.mjs';
import { runRetroMappingMatrix } from './retro-mapping-matrix.mjs';
import { runMidtermTargetStreakCheck } from './midterm-target-streak-check.mjs';
import { runKnowledgeReuseKpi } from './knowledge-reuse-kpi.mjs';

function parseArgs(argv) {
  const o = { bookRoot: null, weekLabel: null, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') o.bookRoot = path.resolve(argv[++i] || '');
    else if (a === '--week-label') o.weekLabel = String(argv[++i] || '').trim() || null;
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

export function runMidtermMilestoneReport({ bookRoot, weekLabel = null } = {}) {
  const root = path.resolve(bookRoot || process.cwd());
  const governance = path.join(root, '.fbs', 'governance');
  fs.mkdirSync(governance, { recursive: true });
  const week = weekLabel || getIsoWeekLabel(new Date());
  const governanceReport = readJson(path.join(governance, `midterm-governance-report-${week}.json`), {});
  const trend = runMidtermTrendSummary({ bookRoot: root });
  const retro = runRetroMappingMatrix({ bookRoot: root });
  const streak = runMidtermTargetStreakCheck({ bookRoot: root });
  const reuse = runKnowledgeReuseKpi({ bookRoot: root });
  const payload = {
    schemaVersion: '1.0.0',
    domain: 'governance',
    generatedAt: new Date().toISOString(),
    weekLabel: week,
    bookRoot: root,
    status: governanceReport?.status || 'unknown',
    summary: {
      governanceStatus: governanceReport?.status || 'unknown',
      trend: trend.metrics || {},
      unresolvedRetro: retro.totals?.unresolved || 0,
      targetStreak: streak.totals?.currentStreak || 0,
      targetQualified: streak.qualified || false,
      knowledgeReuseRate: reuse.totals?.reuseRate || 0,
    },
    artifacts: {
      governanceReport: path.join(governance, `midterm-governance-report-${week}.json`),
      trendSummary: trend.jsonPath,
      retroMapping: retro.jsonPath,
      targetStreak: streak.jsonPath,
      knowledgeReuse: reuse.jsonPath,
    },
  };
  const jsonPath = path.join(governance, `midterm-milestone-report-${week}.json`);
  const mdPath = path.join(governance, `midterm-milestone-report-${week}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  const md = [
    `# Midterm Milestone Report (${week})`,
    '',
    `- status: ${payload.status}`,
    `- targetStreak: ${payload.summary.targetStreak}`,
    `- targetQualified: ${payload.summary.targetQualified}`,
    `- knowledgeReuseRate: ${payload.summary.knowledgeReuseRate}%`,
    '',
    '## Artifacts',
    ...Object.entries(payload.artifacts).map(([k, v]) => `- ${k}: ${v}`),
    '',
  ].join('\n');
  fs.writeFileSync(mdPath, `${md}\n`, 'utf8');
  return { code: 0, message: 'ok', jsonPath, mdPath, ...payload };
}

async function main() {
  const args = parseArgs(process.argv);

  // 参数校验
  if (!args.bookRoot) {
    throw new UserError('中期里程碑报告', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录> [--week-label 2026-W16] [--json]'
    });
  }

  console.log('🏆 正在生成中期里程碑报告...');
  const out = runMidtermMilestoneReport(args);

  if (args.json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`✅ 里程碑报告生成完成`);
    console.log(`   状态: ${out.status.toUpperCase()}`);
    console.log(`   目标连续: ${out.summary.targetStreak} 周`);
    console.log(`   知识复用率: ${out.summary.knowledgeReuseRate}%`);
    console.log(`   JSON: ${out.jsonPath}`);
  }

  return out.code;
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1].endsWith('midterm-milestone-report.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '中期里程碑报告' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
