#!/usr/bin/env node
import { UserError } from './lib/user-errors.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NaturalLanguageEngine } from './nlu-optimization.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = {
    out: path.join(ROOT, '.fbs', 'governance', 'intent-ops-report.json'),
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) out.out = path.resolve(argv[++i]);
  }
  return out;
}

const SAMPLE_CASES = [
  '福帮手',
  '帮我写一本白皮书',
  '继续上次第3章',
  '质量自检一下',
  '导出pdf',
  '退出福帮手',
  '好',
  '可以',
  '帮我看看',
];

async function main() {
  const args = parseArgs(process.argv);

  console.log(`[intent-ops-report] 开始生成意图操作报告...`);
  console.log(`[intent-ops-report] 正在初始化 NLU 引擎...`);
  const engine = new NaturalLanguageEngine();

  console.log(`[intent-ops-report] 正在识别 ${SAMPLE_CASES.length} 条测试用例...`);
  const rows = SAMPLE_CASES.map((text) => ({ text, ...engine.recognizeIntent(text) }));
  const total = rows.length;
  const clarifyCount = rows.filter((r) => r.shouldClarify).length;
  const lowCount = rows.filter((r) => r.confidenceBand === 'low').length;
  const payload = {
    generatedAt: new Date().toISOString(),
    version: '2.1.2',
    totalCases: total,
    clarifyRate: Number(((clarifyCount / total) * 100).toFixed(2)),
    lowConfidenceRate: Number(((lowCount / total) * 100).toFixed(2)),
    rows,
  };

  console.log(`[intent-ops-report] 正在写入报告文件...`);
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`[intent-ops-report] 报告生成完成！ clarifyRate=${payload.clarifyRate}%, lowConfidence=${payload.lowConfidenceRate}%`);
  console.log(JSON.stringify(payload, null, 2));
}

if (process.argv[1] && process.argv[1].endsWith('intent-ops-report.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '意图操作报告' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
