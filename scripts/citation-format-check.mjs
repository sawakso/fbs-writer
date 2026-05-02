#!/usr/bin/env node
/**
 * 引用格式快速检查：
 * - A 级：正文应出现至少一个来源标注（〔来源：...〕或（来源：...））
 * - C 级：应包含"本章数据来源索引"标题
 */
import fs from "fs";
import path from "path";
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const o = { chapterFile: null, enforce: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--chapter-file") o.chapterFile = argv[++i];
    else if (a === "--enforce") o.enforce = true;
  }
  return o;
}

function main() {
  const args = parseArgs(process.argv);

  // 参数校验
  if (!args.chapterFile) {
    throw new UserError('引用格式检查', '缺少 --chapter-file 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --chapter-file <章节.md文件路径>'
    });
  }

  const p = path.resolve(args.chapterFile);
  if (!fs.existsSync(p)) {
    throw new UserError('引用格式检查', `文件不存在: ${p}`, {
      code: 'ERR_FILE_NOT_FOUND',
      detail: '指定的章节文件不存在',
      solution: '请检查文件路径是否正确'
    });
  }

  console.log(`[引用格式检查] 检查文件: ${path.relative(process.cwd(), p)}`);
  const t = fs.readFileSync(p, "utf8");
  const hasInline = /〔来源：[^〕]+〕|（来源：[^）]+）/.test(t);
  const hasIndex = /(^|\n)#{1,3}\s*本章数据来源索引/.test(t);

  const issues = [];
  if (!hasInline) issues.push("缺少正文来源标注（A级）");
  if (!hasIndex) issues.push("缺少"本章数据来源索引"章节（C级）");

  if (!issues.length) {
    console.log("引用格式检查: ✅ 通过");
    return;
  }

  console.log("引用格式检查: ⚠ 未通过");
  issues.forEach((i) => console.log(`  - ${i}`));

  if (args.enforce) {
    throw new UserError('引用格式检查', '引用格式检查未通过', {
      code: 'ERR_CITATION_FORMAT',
      detail: issues.join('; '),
      solution: '请补充来源标注和"本章数据来源索引"章节'
    });
  }
}

if (process.argv[1] && process.argv[1].endsWith('citation-format-check.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '引用格式检查' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
