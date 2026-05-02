#!/usr/bin/env node
/**
 * P0 A3：进化/规范变更与发版同级门控（轻量）
 * - 校验 scripts/generated/scripts-manifest.json 存在
 * - 校验轨迹 schema 存在
 * - 可选：FBS_STRICT_EVOLUTION=1 时要求 git 工作区无未提交 references 变更（需 git）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { UserError } from './lib/user-errors.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function main() {
  console.log('🔍 开始进化门禁检查...');

  const manifest = path.join(ROOT, 'scripts', 'generated', 'scripts-manifest.json');
  if (!fs.existsSync(manifest)) {
    throw new UserError('进化门禁', `缺少 ${manifest}`, {
      code: 'ENOENT',
      solution: '请先运行: node scripts/generate-scripts-manifest.mjs'
    });
  }
  console.log(`  ✓ 找到脚本清单: ${manifest}`);

  const traceSchema = path.join(ROOT, 'references', '05-ops', 'fbs-trace-events.schema.json');
  if (!fs.existsSync(traceSchema)) {
    throw new UserError('进化门禁', `缺少轨迹 schema: ${traceSchema}`, {
      code: 'ENOENT',
      solution: '请检查 references/05-ops/ 目录是否存在 fbs-trace-events.schema.json'
    });
  }
  console.log(`  ✓ 找到轨迹 schema: ${traceSchema}`);

  if (process.env.FBS_STRICT_EVOLUTION === '1') {
    console.log('  🔒 FBS_STRICT_EVOLUTION=1，检查 references/ 变更...');
    const git = spawnSync('git', ['diff', '--name-only', 'references'], { cwd: ROOT, encoding: 'utf8' });
    if (git.status === 0 && git.stdout?.trim()) {
      throw new UserError('进化门禁', 'references/ 存在未提交变更，请先提交或暂存后再打包', {
        code: 'ERR_CHILD_PROCESS',
        solution: '请先提交或暂存 references/ 目录的变更，然后再执行此脚本'
      });
    }
    console.log('  ✓ references/ 无未提交变更');
  }

  console.log('✅ 进化门禁检查通过：scripts-manifest + trace schema OK');
}

if (process.argv[1] && process.argv[1].endsWith('evolution-gate.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '进化门禁' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
