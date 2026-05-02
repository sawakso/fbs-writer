#!/usr/bin/env node
/**
 * 为缺失 v2.1.1 扩写计划契约区块的 expansion-plan.md 追加最小骨架（用户确认 + 空机读表占位），
 * 便于后续人工补全；不覆盖已有「## 用户确认」。
 *
 * 用法：node scripts/repair-expansion-plan-skeleton.mjs --book-root <本书根> [--dry-run]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { globSync } from "glob";
import { UserError, tryMain } from "./lib/user-errors.mjs";

const __filename = fileURLToPath(import.meta.url);

function buildTemplateWithDetectedRow(bookRoot) {
  const cands = globSync("**/*.md", {
    cwd: bookRoot,
    nodir: true,
    windowsPathsNoEscape: true,
    ignore: ["**/.fbs/**", "**/node_modules/**", "**/dist/**", "**/references/**", "**/docs/**"],
  });
  const best = cands.find((p) => /(chapter|chapters|ch\d+|全稿|deliverables)/i.test(p)) || cands[0] || "chapters/ch01.md";
  const abs = path.resolve(bookRoot, best);
  let targetChars = 8000;
  try {
    if (fs.existsSync(abs)) {
      const n = fs.readFileSync(abs, "utf8").replace(/\s+/g, "").length;
      if (n > 0) targetChars = Math.max(3000, Math.min(200000, n + 2000));
    }
  } catch {
    // ignore
  }
  return `

## 全书目标

- 本轮扩写按章节逐步推进，优先保证事实一致与结构完整。

## 执行策略

- 推荐并行度：3（WorkBuddy平台建议不超过5，避免步骤限制）
- 每2章完成后暂停汇报进度，支持断点续生成
- 字数目标 >= 10万字时自动启用分卷模式（每卷30万字）

## 用户确认

用户确认记录：待会话记录补全（relaxed 模式不阻断）。

## 章节扩写目标表（机读）

| 章节ID | 文件 | 目标字符 | 备注 |
|--------|------|----------|------|
| CH01 | \`${best.replace(/\\/g, "/")}\` | ${targetChars} | 自动生成占位行，请按真实计划补全 |

`;
}

function parseArgs(argv) {
  const o = { bookRoot: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--book-root") o.bookRoot = path.resolve(argv[++i] || "");
    else if (a === "--dry-run") o.dryRun = true;
  }
  return o;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    throw new UserError('修复扩写计划骨架', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录>'
    });
  }
  const planPath = path.join(args.bookRoot, ".fbs", "expansion-plan.md");
  if (!fs.existsSync(planPath)) {
    throw new UserError('修复扩写计划骨架', `缺少 ${planPath}`, {
      code: 'ENOENT',
      solution: '请检查 --book-root 路径是否正确，确保 .fbs/expansion-plan.md 存在'
    });
  }
  let raw = fs.readFileSync(planPath, "utf8");
  if (/##\s*用户确认/i.test(raw) && /##\s*章节扩写目标表|机读/i.test(raw)) {
    console.log("✅ 关键区块已存在，无需修复");
    process.exit(0);
  }
  console.log("开始追加扩写计划骨架...");
  raw += buildTemplateWithDetectedRow(args.bookRoot);
  if (!args.dryRun) {
    fs.writeFileSync(planPath, raw, "utf8");
  }
  console.log(`✅ ${args.dryRun ? "（dry-run）" : ""}已追加最小骨架 → ${planPath}`);
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  tryMain(main, { friendlyName: '修复扩写计划骨架' });
}
