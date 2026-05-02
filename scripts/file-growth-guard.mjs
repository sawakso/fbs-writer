#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const o = {
    bookRoot: null,
    enforce: false,
    json: false,
    maxMb: 8,
    maxTotalMb: 64,
    softMaxMb: 5,
    softTotalMb: 40,
    excludeAuditJsonl: true,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--book-root") o.bookRoot = path.resolve(argv[++i] || "");
    else if (a === "--enforce") o.enforce = true;
    else if (a === "--json") o.json = true;
    else if (a === "--max-mb") o.maxMb = Number(argv[++i] || 8);
    else if (a === "--max-total-mb") o.maxTotalMb = Number(argv[++i] || 64);
    else if (a === "--soft-mb") o.softMaxMb = Number(argv[++i] || 5);
    else if (a === "--soft-total-mb") o.softTotalMb = Number(argv[++i] || 40);
    else if (a === "--no-exclude-audit-jsonl") o.excludeAuditJsonl = false;
  }
  return o;
}

export function shouldTrackGrowthFile(rel, opts = {}) {
  const n = rel.replace(/\\/g, "/");
  if (opts.excludeAuditJsonl !== false && n.includes(".fbs/audit/") && n.endsWith(".jsonl")) {
    return false;
  }
  if (n.startsWith(".fbs/")) return true;
  if (n.startsWith("deliverables/")) return true;
  if (n.startsWith("releases/")) return true;
  return false;
}

function scanFiles(root, opts = {}) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git") continue;
        walk(full);
        continue;
      }
      if (!e.isFile()) continue;
      const rel = path.relative(root, full);
      if (!shouldTrackGrowthFile(rel, opts)) continue;
      const size = fs.statSync(full).size;
      out.push({ file: rel.replace(/\\/g, "/"), bytes: size, mb: Number((size / 1024 / 1024).toFixed(2)) });
    }
  };
  walk(root);
  return out;
}

/**
 * @param {object} opts
 * @param {string} [opts.bookRoot]
 * @param {boolean} [opts.enforce]
 * @param {number} [opts.maxMb] 硬阈值：单文件 MB
 * @param {number} [opts.maxTotalMb] 硬阈值：追踪总量 MB
 * @param {number} [opts.softMaxMb] 软阈值：单文件超过即记入 softOversized（仍须 ≤maxMb 才不算硬 oversized）
 * @param {number} [opts.softTotalMb] 软阈值：总量超过即 advisory
 * @param {boolean} [opts.excludeAuditJsonl]
 */
export function runFileGrowthGuard({
  bookRoot,
  enforce = false,
  maxMb = 8,
  maxTotalMb = 64,
  softMaxMb = 5,
  softTotalMb = 40,
  excludeAuditJsonl = true,
} = {}) {
  const root = path.resolve(bookRoot || process.cwd());
  const scanOpts = { excludeAuditJsonl };
  if (!fs.existsSync(root)) {
    return { code: 2, message: "bookRoot not found", oversized: [], totalMb: 0 };
  }
  const files = scanFiles(root, scanOpts);
  const oversized = files.filter((x) => x.mb > maxMb).sort((a, b) => b.mb - a.mb);
  const softOversized = files
    .filter((x) => x.mb > softMaxMb && x.mb <= maxMb)
    .sort((a, b) => b.mb - a.mb);
  const totalMb = Number((files.reduce((a, b) => a + b.mb, 0)).toFixed(2));
  const alerts = [];
  if (oversized.length) alerts.push(`oversized-files:${oversized.length}`);
  if (totalMb > maxTotalMb) alerts.push(`tracked-total-too-large:${totalMb}MB`);
  const advisoryAlerts = [];
  if (softOversized.length) advisoryAlerts.push(`large-files-approaching:${softOversized.length}`);
  if (totalMb > softTotalMb && totalMb <= maxTotalMb) {
    advisoryAlerts.push(`tracked-total-approaching:${totalMb}MB`);
  }
  const blocked = enforce && alerts.length > 0;

  const report = {
    schemaVersion: "1.1.0",
    generatedAt: new Date().toISOString(),
    root,
    policy: { maxMb, maxTotalMb, softMaxMb, softTotalMb, enforce: !!enforce, excludeAuditJsonl: !!excludeAuditJsonl },
    totals: { trackedFiles: files.length, totalMb },
    oversized,
    softOversized,
    alerts,
    advisoryAlerts,
    blocked,
  };
  const fbsDir = path.join(root, ".fbs");
  fs.mkdirSync(fbsDir, { recursive: true });
  const outPath = path.join(fbsDir, "file-growth-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  return {
    code: blocked ? 1 : 0,
    message: blocked ? "file-growth-guard blocked" : "ok",
    outputPath: outPath,
    ...report,
  };
}

function main() {
  const args = parseArgs(process.argv);

  // 参数校验
  if (!args.bookRoot) {
    throw new UserError('文件增长守卫', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录>'
    });
  }

  console.log(`[文件增长守卫] 开始扫描...`);
  const out = runFileGrowthGuard(args);

  if (args.json) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log(`[文件增长守卫] ${out.message}`);
  console.log(`[文件增长守卫] 追踪文件数: ${out.totals.trackedFiles}, 总大小: ${out.totals.totalMb}MB`);

  if (out.advisoryAlerts?.length) {
    console.log(`[文件增长守卫] ⚠ 警告: ${out.advisoryAlerts.join(", ")}`);
  }

  if (out.oversized.length) {
    console.log(`[文件增长守卫] ⚠ 超限文件 ${out.oversized.length} 个:`);
    out.oversized.slice(0, 5).forEach((x) => console.log(`  - ${x.file} (${x.mb}MB)`));
  }

  console.log(`[文件增长守卫] 报告已保存: ${out.outputPath}`);

  if (out.blocked) {
    throw new UserError('文件增长守卫', '文件大小超过阈值', {
      code: 'ERR_FILE_TOO_LARGE',
      detail: `${out.oversized.length} 个文件超过 ${args.maxMb}MB 阈值`,
      solution: '请检查并优化大文件，或调整 --max-mb 参数'
    });
  }

  console.log(`[文件增长守卫] ✅ 检查通过`);
}

if (process.argv[1] && process.argv[1].endsWith('file-growth-guard.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '文件增长守卫' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
