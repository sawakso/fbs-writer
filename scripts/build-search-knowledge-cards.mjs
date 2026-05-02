#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const o = { bookRoot: null, json: false, minSummaryLen: 4 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') o.bookRoot = path.resolve(argv[++i] || '');
    else if (a === '--json') o.json = true;
    else if (a === '--min-summary-len') o.minSummaryLen = Math.max(1, Number(argv[++i] || 4));
  }
  return o;
}

function parseJsonl(filePath) {
  const out = [];
  if (!fs.existsSync(filePath)) return out;
  const body = fs.readFileSync(filePath, 'utf8');
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t));
    } catch {
      // ignore bad line
    }
  }
  return out;
}

function cardId(entry) {
  const key = `${entry.query || ''}|${entry.url || ''}|${entry.stage || ''}|${entry.chapterId || ''}`.toLowerCase();
  return `KC-${crypto.createHash('sha1').update(key).digest('hex').slice(0, 10)}`;
}

function normalizeRiskTier(text) {
  const s = String(text || '').toLowerCase();
  if (/价格|pricing|法规|监管|compliance|版本|version|模型|model|费率|sla/.test(s)) return 'high';
  if (/市场|规模|份额|排名|数据/.test(s)) return 'medium';
  return 'low';
}

function toCard(entry, minSummaryLen) {
  const summary = String(entry.resultSummary || entry.summary || entry.message || '').trim();
  const query = String(entry.query || entry.searchScope || '').trim();
  const url = String(entry.url || '').trim();
  if (!query || !url || summary.length < minSummaryLen) return null;
  return {
    cardId: cardId(entry),
    statement: summary,
    sourceUrl: url,
    query,
    stage: String(entry.stage || entry.workflowStage || '').toUpperCase() || null,
    chapterId: String(entry.chapterId || 'global'),
    timestamp: entry.timestamp || new Date().toISOString(),
    riskTier: normalizeRiskTier(`${query} ${summary}`),
    invalidAfter: null,
  };
}

function writeMd(outPath, payload) {
  const lines = [];
  lines.push('# Search Knowledge Cards');
  lines.push('');
  lines.push(`- generatedAt: ${payload.generatedAt}`);
  lines.push(`- total: ${payload.totals.all}`);
  lines.push(`- highRisk: ${payload.totals.highRisk}`);
  lines.push('');
  lines.push('## Cards');
  for (const c of payload.cards.slice(0, 120)) {
    lines.push(`- [${c.cardId}] (${c.riskTier}) ${c.statement}`);
    lines.push(`  - source: ${c.sourceUrl}`);
    lines.push(`  - query: ${c.query}`);
  }
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
}

export function runBuildSearchKnowledgeCards({ bookRoot, minSummaryLen = 4 } = {}) {
  const root = path.resolve(bookRoot || process.cwd());
  const fbs = path.join(root, '.fbs');
  const ledgerPath = path.join(fbs, 'search-ledger.jsonl');

  if (!fs.existsSync(ledgerPath)) {
    throw new UserError('构建搜索知识卡片', `搜索台账文件不存在：${ledgerPath}`, {
      code: 'ENOENT',
      solution: '请确认 .fbs/search-ledger.jsonl 存在，或先运行搜索相关流程生成台账',
    });
  }

  console.log(`[knowledge-cards] 正在读取台账: ${ledgerPath}`);
  const entries = parseJsonl(ledgerPath).filter((e) => e.kind === 'search' || e.kind === 'search_preflight' || !e.kind);
  console.log(`[knowledge-cards] 读取 ${entries.length} 条记录`);

  const cards = [];
  const seen = new Set();
  for (const e of entries) {
    const card = toCard(e, minSummaryLen);
    if (!card) continue;
    if (seen.has(card.cardId)) continue;
    seen.add(card.cardId);
    cards.push(card);
  }

  console.log(`[knowledge-cards] 生成 ${cards.length} 张卡片（去重后）`);

  const governanceDir = path.join(fbs, 'governance');
  fs.mkdirSync(governanceDir, { recursive: true });
  const payload = {
    schemaVersion: '1.0.0',
    domain: 'governance',
    generatedAt: new Date().toISOString(),
    bookRoot: root,
    sourceLedger: ledgerPath,
    totals: {
      all: cards.length,
      highRisk: cards.filter((x) => x.riskTier === 'high').length,
    },
    cards,
  };
  const jsonPath = path.join(governanceDir, 'search-knowledge-cards.json');
  const mdPath = path.join(governanceDir, 'search-knowledge-cards.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  writeMd(mdPath, payload);

  console.log(`[knowledge-cards] JSON: ${jsonPath}`);
  console.log(`[knowledge-cards] MD: ${mdPath}`);

  return { code: 0, message: 'ok', jsonPath, mdPath, ...payload };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    throw new UserError('构建搜索知识卡片', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录>',
    });
  }

  console.log(`[knowledge-cards] 书稿根目录: ${args.bookRoot}`);

  const out = runBuildSearchKnowledgeCards(args);

  if (args.json) return out;

  console.log(`[knowledge-cards] cards=${out.totals.all} highRisk=${out.totals.highRisk}`);
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('build-search-knowledge-cards.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '构建搜索知识卡片' }))
    .catch((err) => {
      console.error('无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
