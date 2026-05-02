#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const out = {
    bookRoot: null,
    skillRoot: path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'),
    runRefine: false,
    strict: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') out.bookRoot = path.resolve(argv[++i] || '');
    else if (a === '--skill-root') out.skillRoot = path.resolve(argv[++i] || '');
    else if (a === '--run-refine') out.runRefine = true;
    else if (a === '--strict') out.strict = true;
  }
  return out;
}

function runNode(scriptPath, args) {
  const r = spawnSync(process.execPath, [scriptPath, ...args], { stdio: 'inherit' });
  return typeof r.status === 'number' ? r.status : 2;
}

function writeReport(bookRoot, payload) {
  const out = path.join(bookRoot, '.fbs', 'governance', 'delivery-chain-last.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return out;
}

export function runDeliveryChain({ bookRoot, skillRoot, runRefine = false, strict = false } = {}) {
  if (!bookRoot) {
    throw new UserError('交付链', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录>'
    });
  }
  const scriptsRoot = path.join(skillRoot, 'scripts');
  const startedAt = new Date().toISOString();
  const steps = [];

  console.log('[delivery-chain] 阶段 1/3: 执行质量检查...');
  const qualityArgs = ['--book-root', bookRoot];
  if (strict) qualityArgs.push('--strict');
  const qualityCode = runNode(path.join(scriptsRoot, 'fbs-quality-full.mjs'), qualityArgs);
  steps.push({ id: 'quality', code: qualityCode, cmd: `node scripts/fbs-quality-full.mjs ${qualityArgs.join(' ')}` });
  if (qualityCode !== 0) {
    const reportPath = writeReport(bookRoot, { startedAt, finishedAt: new Date().toISOString(), status: 'failed', steps });
    return { code: qualityCode, reportPath, status: 'failed' };
  }
  console.log('[delivery-chain] 质量检查通过');

  if (runRefine) {
    console.log('[delivery-chain] 阶段 2/3: 执行精修打磨...');
    const refineArgs = ['--book-root', bookRoot, '--strict'];
    const refineCode = runNode(path.join(scriptsRoot, 'polish-gate.mjs'), refineArgs);
    steps.push({ id: 'refine', code: refineCode, cmd: `node scripts/polish-gate.mjs ${refineArgs.join(' ')}` });
    if (refineCode !== 0) {
      const reportPath = writeReport(bookRoot, { startedAt, finishedAt: new Date().toISOString(), status: 'failed', steps });
      return { code: refineCode, reportPath, status: 'failed' };
    }
    console.log('[delivery-chain] 精修打磨通过');
  } else {
    steps.push({ id: 'refine', code: 0, skipped: true, reason: 'run with --run-refine to enable polish-gate' });
    console.log('[delivery-chain] 阶段 2/3: 跳过精修打磨（未指定 --run-refine）');
  }

  console.log('[delivery-chain] 阶段 3/3: 执行章节导出...');
  const exportArgs = ['--book-root', bookRoot];
  const exportCode = runNode(path.join(scriptsRoot, 'merge-chapters.mjs'), exportArgs);
  steps.push({ id: 'export', code: exportCode, cmd: `node scripts/merge-chapters.mjs ${exportArgs.join(' ')}` });
  const status = exportCode === 0 ? 'passed' : 'failed';
  const reportPath = writeReport(bookRoot, {
    startedAt,
    finishedAt: new Date().toISOString(),
    status,
    steps,
  });
  return { code: exportCode, reportPath, status };
}

function main() {
  const args = parseArgs(process.argv);
  console.log('[delivery-chain] 交付链开始执行...');
  const out = runDeliveryChain(args);
  console.log(`[delivery-chain] 最终状态: ${out.status}`);
  console.log(`[delivery-chain] 报告路径: ${out.reportPath}`);
  process.exit(out.code);
}

if (process.argv[1] && process.argv[1].endsWith('delivery-chain.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '交付链' }))
    .catch((err) => {
      console.error('无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
