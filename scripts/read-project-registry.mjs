#!/usr/bin/env node
/**
 * read-project-registry.mjs — 跨会话书稿注册表读取器
 *
 * 用途：
 *   AI 在新会话中调用此脚本，获取所有已知书稿项目列表，
 *   避免直接 filesystem.read 注册表 JSON（触发文件卡片弹出）。
 *
 * 用法：
 *   node scripts/read-project-registry.mjs                // 列出所有项目
 *   node scripts/read-project-registry.mjs --search 渡     // 按关键词搜索
 *   node scripts/read-project-registry.mjs --latest        // 最近打开的项目
 *   node scripts/read-project-registry.mjs --json          // 输出完整 JSON
 *
 * 输出格式（非 JSON 模式）：
 *   找到 3 个书稿项目：
 *   1. 《渡》 — /root/books/渡/ — S3 · 60/60 章 ✅
 *   2. 《Python入门》 — /root/books/python/ — S2 · 大纲就绪
 *   3. （无标题） — /tmp/test/ — S1 · 3 章
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

const REGISTRY_PATH = path.join(os.homedir(), '.workbuddy', 'fbs-book-projects.json');

function safeReadJson(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function readChapterStatus(bookRoot) {
  const statusPath = path.join(bookRoot, '.fbs', 'chapter-status.md');
  if (!fs.existsSync(statusPath)) return null;
  try {
    const content = fs.readFileSync(statusPath, 'utf8');
    const doneMatch = content.match(/(\d+)\s*\/\s*(\d+)/);
    if (doneMatch) {
      return { done: parseInt(doneMatch[1]), total: parseInt(doneMatch[2]) };
    }
  } catch { /* ignore */ }
  return null;
}

function getTitle(entry) {
  if (entry.bookTitle && entry.bookTitle.trim()) return entry.bookTitle.trim();
  const base = path.basename(entry.bookRoot);
  return base || '（未命名项目）';
}

function getStageLabel(stage) {
  const labels = { S0: '素材收集', S1: '大纲规划', S2: '大纲确认', S3: '写稿中', S4: '质检中', S5: '交付' };
  return labels[stage] || stage || '未知';
}

function buildSummaryLine(entry) {
  const title = getTitle(entry);
  const stage = getStageLabel(entry.currentStage);
  const cs = readChapterStatus(entry.bookRoot);

  let suffix = `— ${entry.bookRoot} — ${stage}`;
  if (cs) suffix += ` · ${cs.done}/${cs.total} 章`;
  return `《${title}》 — ${suffix}`;
}

function parseArgs(argv) {
  const args = { search: null, latest: false, json: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--search' && argv[i + 1]) args.search = argv[++i];
    else if (t === '--latest') args.latest = true;
    else if (t === '--json') args.json = true;
    else if (t === '--help' || t === '-h') args.help = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(`用法: node read-project-registry.mjs [选项]

选项:
  --search <关键词>   按标题或路径搜索
  --latest           只显示最近打开的项目（最多 3 个）
  --json             输出完整 JSON
  --help             显示帮助`);
    process.exit(0);
  }

  const registry = safeReadJson(REGISTRY_PATH);
  if (!registry || !Array.isArray(registry.entries) || registry.entries.length === 0) {
    if (args.json) {
      console.log(JSON.stringify({ ok: true, entries: [], total: 0 }));
    } else {
      console.log('暂未发现书稿项目。');
    }
    process.exit(0);
  }

  let entries = registry.entries;

  // 过滤不存在的目录
  entries = entries.filter(e => {
    try { return fs.existsSync(e.bookRoot) && fs.existsSync(path.join(e.bookRoot, '.fbs')); }
    catch { return false; }
  });

  // 排序：最近使用的在前
  entries.sort((a, b) => {
    const ta = a.lastExitAt ? new Date(a.lastExitAt).getTime() : 0;
    const tb = b.lastExitAt ? new Date(b.lastExitAt).getTime() : 0;
    return tb - ta;
  });

  // 搜索过滤
  if (args.search) {
    const q = args.search.toLowerCase().trim();
    entries = entries.filter(e => {
      const title = (e.bookTitle || path.basename(e.bookRoot)).toLowerCase();
      const root = e.bookRoot.toLowerCase();
      return title.includes(q) || root.includes(q) || path.basename(e.bookRoot).toLowerCase().includes(q);
    });
  }

  // 最新
  if (args.latest) {
    entries = entries.slice(0, 3);
  }

  if (args.json) {
    const out = entries.map(e => ({
      bookRoot: e.bookRoot,
      bookTitle: e.bookTitle || null,
      currentStage: e.currentStage || null,
      lastExitAt: e.lastExitAt || null,
      registeredAt: e.registeredAt || null,
    }));
    console.log(JSON.stringify({ ok: true, entries: out, total: out.length }));
    process.exit(0);
  }

  // 人类可读输出
  if (entries.length === 0) {
    if (args.search) {
      console.log(`未搜索到与「${args.search}」相关的书稿项目。`);
    } else {
      console.log('暂未发现书稿项目。');
    }
    process.exit(0);
  }

  const lines = entries.map((e, i) => `  ${i + 1}. ${buildSummaryLine(e)}`).join('\n');
  console.log(`找到 ${entries.length} 个书稿项目：`);
  console.log();
  console.log(lines);
}

main();
