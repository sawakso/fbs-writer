#!/usr/bin/env node
/**
 * 终稿清理脚本 — 去除写作过程标注，生成干净的交付物
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 *
 * 清理内容：
 * - <!-- source: ... --> 内部跟踪注释
 * - **（第XX章完）** 章节结束标记
 * - 合并文件头部的时间戳/元信息
 * - 多余的空行和分隔线
 *
 * 用法：
 *   node scripts/strip-manuscript-annotations.mjs --input <合并稿.md> --output <清理稿.md>
 *   node scripts/strip-manuscript-annotations.mjs --input 全稿.md --output 交付稿.md --toc
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const out = { input: null, output: null, toc: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') out.input = argv[++i];
    else if (a === '--output') out.output = argv[++i];
    else if (a === '--toc') out.toc = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.input || !args.output) {
    console.error('用法: node strip-manuscript-annotations.mjs --input <合并稿.md> --output <清理稿.md> [--toc]');
    process.exit(1);
  }

  let text = fs.readFileSync(args.input, 'utf8');
  let removedCount = { comments: 0, markers: 0, meta: 0 };

  // 1. Strip HTML comments (<!-- ... -->)
  const beforeComments = text.length;
  text = text.replace(/<!--[\s\S]*?-->/g, (match) => {
    removedCount.comments++;
    return '';
  });

  // 2. Strip chapter end markers
  text = text.replace(/\*\*（第\d+章完）\*\*/g, () => {
    removedCount.markers++;
    return '';
  });

  // 3. Strip merge preamble (first H1 if it contains "全稿" or "merged")
  text = text.replace(/^# .*?(全稿|merged|合稿).*\n(?:\n|>.*\n)*?---\n*/im, (match) => {
    removedCount.meta++;
    return '';
  });

  // 4. Strip standalone separator lines (---) that are between chapters
  text = text.replace(/\n---\n/g, '\n\n');

  // 5. Normalize excessive blank lines (3+ → 2)
  text = text.replace(/\n{4,}/g, '\n\n\n');

  // 6. Strip leading/trailing whitespace
  text = text.trim() + '\n';

  // 7. Build TOC if requested
  if (args.toc) {
    const headings = text.match(/^#{1,3}\s.+/gm) || [];
    if (headings.length > 0) {
      let tocLines = ['# 目录\n'];
      for (const h of headings) {
        const level = (h.match(/^#+/)[0].length - 1) * 2;
        const title = h.replace(/^#+\s/, '');
        tocLines.push(`${' '.repeat(level)}- ${title}`);
      }
      const firstH1 = text.search(/^#\s/m);
      if (firstH1 >= 0) {
        text = text.slice(0, firstH1) + tocLines.join('\n') + '\n\n' + text.slice(firstH1);
      }
    }
  }

  fs.writeFileSync(args.output, text, 'utf8');

  const outputSize = Buffer.byteLength(text, 'utf8');
  console.log(`✅ 终稿清理完成`);
  console.log(`   移除 HTML 注释: ${removedCount.comments} 个`);
  console.log(`   移除章节标记:   ${removedCount.markers} 个`);
  console.log(`   移除元信息:     ${removedCount.meta} 处`);
  console.log(`   输出文件:       ${args.output}`);
  console.log(`   文件大小:       ${(outputSize / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error('❌ 清理失败:', err.message);
  process.exit(1);
});
