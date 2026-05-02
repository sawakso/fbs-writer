#!/usr/bin/env node
/**
 * 工作流阶段清单（轻量）：输出 chapter-status 中待处理章节摘要。
 */
import fs from "fs";
import path from "path";
import { UserError } from "./lib/user-errors.mjs";

function parseArgs(argv) {
  const o = { bookRoot: process.cwd(), current: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--book-root") o.bookRoot = argv[++i];
    else if (a === "--current") o.current = argv[++i];
  }
  return o;
}

function main() {
  const args = parseArgs(process.argv);
  
  if (!args.bookRoot) {
    throw new UserError('工作流进度器', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录> 指定书稿目录'
    });
  }
  
  console.log('[工作流进度器] 开始扫描待处理章节...');
  
  const stPath = path.join(path.resolve(args.bookRoot), ".fbs", "chapter-status.md");
  if (!fs.existsSync(stPath)) {
    throw new UserError('工作流进度器', `找不到章节状态文件: ${stPath}`, {
      code: 'ERR_FILE_NOT_FOUND',
      solution: '请确认 --book-root 路径正确，且已初始化书稿项目（包含 .fbs/chapter-status.md）'
    });
  }

  const pending = [];
  for (const line of fs.readFileSync(stPath, "utf8").split(/\r?\n/)) {
    if (!/^\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((s) => s.trim());
    if (cells.length < 3) continue;
    const id = cells[0];
    const status = cells[2] || "";
    if (!/^ch\d+$/i.test(id)) continue;
    if (!/已完成|✅|完成/.test(status)) pending.push({ id, status });
  }

  console.log(`[工作流进度器] 当前阶段: ${args.current || "(未指定)"}`);
  if (!pending.length) {
    console.log("[工作流进度器] ✅ 无待处理章节");
    process.exit(0);
  }
  console.log(`[工作流进度器] 待处理章节 ${pending.length} 个（前20项）：`);
  pending.slice(0, 20).forEach((p) => console.log(`  - ${p.id}: ${p.status}`));
  console.log(`[工作流进度器] ✅ 扫描完成`);
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('workflow-progressor.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '工作流进度器' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}

console.log('✅ 改造完成: workflow-progressor.mjs');
