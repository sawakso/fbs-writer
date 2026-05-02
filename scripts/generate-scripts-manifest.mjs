#!/usr/bin/env node
/**
 * 生成 scripts 清单（P1 B2）：供进化门控与 Agent 发现入口
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserError } from './lib/user-errors.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'scripts', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'scripts-manifest.json');

function walk(dir, acc, rel = '') {
  let list;
  try {
    list = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    throw new UserError('生成脚本清单', `无法读取目录：${dir}`, {
      code: err.code || 'ENOENT',
      solution: '请确认 scripts/ 目录存在且可读',
    });
  }
  for (const ent of list) {
    if (ent.name.startsWith('.')) continue;
    const full = path.join(dir, ent.name);
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'test' || ent.name === '__tests__' || ent.name === '_deprecated') continue;
      if (ent.name === 'generated') continue;
      walk(full, acc, r);
    } else if (ent.name.endsWith('.mjs') || ent.name.endsWith('.ps1')) {
      acc.push(r.replace(/\\/g, '/'));
    }
  }
}

function main() {
  const scriptsDir = path.join(ROOT, 'scripts');

  if (!fs.existsSync(scriptsDir)) {
    throw new UserError('生成脚本清单', `scripts 目录不存在：${scriptsDir}`, {
      code: 'ENOENT',
      solution: '请确认在技能包根目录下运行此脚本',
    });
  }

  console.log(`[scripts-manifest] 正在扫描 ${scriptsDir} ...`);

  const acc = [];
  walk(scriptsDir, acc, '');
  acc.sort();

  console.log(`[scripts-manifest] 发现 ${acc.length} 个脚本文件`);

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    skillRoot: 'FBS-BookWriter',
    scripts: acc,
    count: acc.length,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`[scripts-manifest] 已写出 ${OUT_FILE}（${acc.length} 项）`);

  return payload;
}

if (process.argv[1] && process.argv[1].endsWith('generate-scripts-manifest.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '生成脚本清单' }))
    .catch((err) => {
      console.error('无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
