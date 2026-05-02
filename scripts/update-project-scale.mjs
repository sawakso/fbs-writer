#!/usr/bin/env node
/**
 * 大纲/初稿启动后：自动估算体量、回写 project-config.json、
 * 解析并保存写作策略档位（S/M/L/XL）。
 *
 * 用法：
 *   node scripts/update-project-scale.mjs --book-root <书稿根>
 *   node scripts/update-project-scale.mjs --book-root <书稿根> --dry-run
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tryMain } from './lib/user-errors.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_SKILL = path.resolve(__dirname, "..");

// ── 参数解析 ───────────────────────────────────────
function parseArgs(argv) {
  const o = { bookRoot: null, skillRoot: DEFAULT_SKILL, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--book-root") o.bookRoot = argv[++i];
    else if (a === "--skill-root") o.skillRoot = path.resolve(argv[++i]);
    else if (a === "--dry-run" || a === "--dryRun") o.dryRun = true;
  }
  return o;
}

// ── 读取 JSON ──────────────────────────────────────────
function readJson(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

// ── 估算章节数 ──────────────────────────────────────
function countChapters(bookRoot) {
  const chaptersDir = path.join(bookRoot, "chapters");
  if (!fs.existsSync(chaptersDir)) return 0;
  return fs.readdirSync(chaptersDir)
    .filter(f => f.endsWith(".md"))
    .length;
}

/**
 * 从 outline 文件估算章节数
 * outline 格式支持：
 *   - `# 第一章` / `## 第一章` / `- 第一章`
 */
function countChaptersFromOutline(bookRoot) {
  const outlinePath = path.join(bookRoot, ".fbs", "outline.md");
  if (!fs.existsSync(outlinePath)) return null;
  const content = fs.readFileSync(outlinePath, "utf8");
  // 匹配中文/英文章节标题行
  const headingRe = /^#{1,3}\s+.+/gm;
  const listRe = /^\s*[-*]\s+.+/gm;
  const byHeading = (content.match(headingRe) || []).length;
  const byList = (content.match(listRe) || []).length;
  return Math.max(byHeading, byList, 0) || null;
}

// ── 主逻辑 ────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    throw new Error('缺少 --book-root 参数');
  }

  const { bookRoot, skillRoot, dryRun } = args;
  const fbs = path.join(bookRoot, ".fbs");
  const configPath = path.join(fbs, "project-config.json");

  // 1. 读取现有配置
  const cfg = readJson(configPath);
  if (!cfg) {
    throw new Error('未找到 project-config.json，请先完成 S0 初始化');
  }

  // 2. 估算章节数（优先用 outline，再扫描 chapters/）
  let planned = Number(cfg.plannedChapterTotal) || 0;
  if (!planned) {
    const fromOutline = countChaptersFromOutline(bookRoot);
    if (fromOutline && fromOutline > 0) {
      planned = fromOutline;
      console.log(`📋 从 outline.md 估算章节数：${planned}`);
    } else {
      const fromDir = countChapters(bookRoot);
      if (fromDir > 0) {
        planned = fromDir;
        console.log(`📁 从 chapters/ 目录扫描章节数：${planned}`);
      }
    }
  } else {
    console.log(`📊 使用已有 plannedChapterTotal：${planned}`);
  }

  // 3. 估算目标字数（如果用户没填）
  let target = Number(cfg.targetWordCount) || 0;
  if (!target && planned > 0) {
    // 默认每章 3000 字（与 repair-expansion-plan-skeleton.mjs 下限一致）
    const DEFAULT_PER_CHAPTER = 3000;
    target = planned * DEFAULT_PER_CHAPTER;
    console.log(`📏 未设置 targetWordCount，按 ${DEFAULT_PER_CHAPTER} 字/章估算：${target.toLocaleString()} 字`);
  }

  // 4. 加载档位配置并解析策略
  const tiersPath = path.join(skillRoot, "references", "05-ops", "scale-tiers.json");
  if (!fs.existsSync(tiersPath)) {
    throw new Error(`未找到 scale-tiers.json：${tiersPath}`);
  }
  const tiers = JSON.parse(fs.readFileSync(tiersPath, "utf8"));

  // 档位解析（与 scale-tiers.mjs 逻辑一致）
  const ORDER = { S: 0, M: 1, L: 2, XL: 3 };
  function tierFromWords(w) {
    const by = tiers.skillWritingStrategy.byTargetWords;
    if (w <= by.S_max) return "S";
    if (w <= by.M_max) return "M";
    if (w <= by.L_max) return "L";
    return "XL";
  }
  function tierFromChapters(c) {
    const by = tiers.skillWritingStrategy.byPlannedChapters;
    if (c <= by.S_max) return "S";
    if (c <= by.M_max) return "M";
    if (c <= by.L_max) return "L";
    return "XL";
  }

  const byW = target > 0 ? tierFromWords(target) : "S";
  const byC = planned > 0 ? tierFromChapters(planned) : "S";
  const tier = ORDER[byW] >= ORDER[byC] ? byW : byC;
  const policy = (tiers.skillWritingStrategy.policyByTier && tiers.skillWritingStrategy.policyByTier[tier]) || "";

  // 5. 输出结果
  console.log(`\n📊 体量估算结果`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   章节数：${planned || "未知"}`);
  console.log(`   估算字数：${target ? target.toLocaleString() + " 字" : "未知"}`);
  console.log(`   字数档位：${byW}`);
  console.log(`   章数档位：${byC}`);
  console.log(`   生效档位：${tier}`);
  console.log(`   执行策略：${policy}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // 6. 保存策略到 .fbs/writing-strategy.json
  const strategy = {
    tier,
    byWords: byW,
    byChapters: byC,
    policy,
    estimatedChapters: planned,
    estimatedWords: target,
    updatedAt: new Date().toISOString(),
  };
  const strategyPath = path.join(fbs, "writing-strategy.json");

  if (dryRun) {
    console.log(`⚠️ dry-run 模式，不写入文件`);
    console.log(`   将要写入 ${configPath}：`);
    console.log(`     plannedChapterTotal: ${planned || '""'}`);
    console.log(`     targetWordCount: ${target || '""'}`);
    console.log(`   将要写入 ${strategyPath}：`);
    console.log(JSON.stringify(strategy, null, 2));
    return;
  }

  // 7. 回写 project-config.json
  const updated = { ...cfg };
  if (planned > 0) updated.plannedChapterTotal = planned;
  if (target > 0) updated.targetWordCount = target;

  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2) + "\n", "utf8");
  console.log(`✅ 已更新 project-config.json`);
  console.log(`   plannedChapterTotal: ${planned || '""'}`);
  console.log(`   targetWordCount: ${target || '""'}`);

  // 8. 写入 writing-strategy.json
  fs.writeFileSync(strategyPath, JSON.stringify(strategy, null, 2) + "\n", "utf8");
  console.log(`✅ 已保存写作策略：${strategyPath}`);
  console.log(`   档位：${tier}（${policy}）`);
}

if (import.meta.url.endsWith('update-project-scale.mjs')) {
  tryMain(main, { friendlyName: '项目规模估算' });
}
