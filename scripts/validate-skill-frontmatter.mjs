#!/usr/bin/env node
/**
 * 校验 SKILL.md frontmatter 顶层键是否在白名单内。
 * pack:skill-gates / npm run doctor 使用。
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { validateSkillFrontmatter } from './lib/skill-frontmatter.mjs';
import { UserError, tryMain } from './lib/user-errors.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const o = { skillRoot: path.resolve(__dirname, '..'), help: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--skill-root' && argv[i + 1]) o.skillRoot = path.resolve(argv[++i]);
    else if (argv[i] === '--help' || argv[i] === '-h') o.help = true;
  }
  return o;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('用法: node scripts/validate-skill-frontmatter.mjs [--skill-root <技能根>]');
    return;
  }

  console.log("开始校验 SKILL.md frontmatter...");
  const { ok, errors } = validateSkillFrontmatter(args.skillRoot);
  if (ok) {
    console.log('✅ SKILL.md frontmatter 键白名单通过');
    return;
  }
  throw new UserError('校验SKILL frontmatter', `校验失败，发现 ${errors.length} 个问题`, {
    code: 'ERR_INVALID_ARG_TYPE',
    solution: '请检查 SKILL.md 的 frontmatter 键是否在白名单内：\n  - ' + errors.join('\n  - ')
  });
}

if (process.argv[1] && process.argv[1].includes('validate-skill-frontmatter')) {
  tryMain(main, { friendlyName: '校验SKILL frontmatter' });
}
