#!/usr/bin/env node
/**
 * 合并 references/05-ops/search-policy.parts/*.json → references/05-ops/search-policy.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  mergeSearchPolicyParts,
  stringifySearchPolicy,
} from "./lib/search-policy-parts.mjs";
import { UserError } from './lib/user-errors.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const o = { skillRoot: path.resolve(__dirname, ".."), check: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--skill-root" && argv[i + 1]) o.skillRoot = path.resolve(argv[++i]);
    else if (argv[i] === "--check") o.check = true;
  }
  return o;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function main() {
  const { skillRoot, check } = parseArgs(process.argv);

  console.log(`[build-search-policy] 技能包根目录: ${skillRoot}`);

  const partsDir = path.join(skillRoot, "references", "05-ops", "search-policy.parts");
  if (!fs.existsSync(partsDir)) {
    throw new UserError('构建搜索策略', `parts 目录不存在：${partsDir}`, {
      code: 'ENOENT',
      solution: '请确认 references/05-ops/search-policy.parts/ 目录存在',
    });
  }

  console.log('[build-search-policy] 正在合并 search-policy.parts ...');
  const merged = mergeSearchPolicyParts(skillRoot);
  const next = stringifySearchPolicy(merged);

  const outPath = path.join(skillRoot, "references", "05-ops", "search-policy.json");

  if (check && fs.existsSync(outPath)) {
    const prev = JSON.parse(fs.readFileSync(outPath, "utf8"));
    if (!deepEqual(prev, merged)) {
      throw new UserError('构建搜索策略', '--check 失败：合并结果与现有 search-policy.json 不一致', {
        solution: '请运行: node scripts/build-search-policy.mjs（不写 --check）后复核 diff',
      });
    }
    console.log("[build-search-policy] --check 通过");
    return;
  }

  fs.writeFileSync(outPath, next, "utf8");
  console.log(`[build-search-policy] 已写入 ${outPath}`);
}

if (process.argv[1] && process.argv[1].endsWith('build-search-policy.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '构建搜索策略' }))
    .catch((err) => {
      console.error('无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
