#!/usr/bin/env node
/**
 * chapter-wordcount-audit.mjs
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 *
 * 功能：审计书稿目录下所有章节的中文字数，输出达标/未达标统计
 * 解决了"写完60章才发现字数不够"的问题——每5章自动审计，提前预警
 *
 * 用法：
 *   node scripts/chapter-wordcount-audit.mjs --book-root <书稿根目录>
 *   node scripts/chapter-wordcount-audit.mjs --book-root <书稿根目录> --failed-only
 *   node scripts/chapter-wordcount-audit.mjs --book-root <书稿根目录> --json
 *
 * 档位下限（从 project-config.json 的 targetWordCount 自动判定）：
 *   ≤3万 → S档 ≥1500汉字/章
 *   ≤10万 → M档 ≥2000汉字/章
 *   ≤100万 → L档 ≥2500汉字/章
 *   >100万 → XL档 ≥3000汉字/章
 */

import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  let bookRoot = null;
  let failedOnly = false;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--book-root' && i + 1 < args.length) {
      bookRoot = args[++i];
    } else if (args[i] === '--failed-only') {
      failedOnly = true;
    } else if (args[i] === '--json') {
      jsonOutput = true;
    }
  }
  return { bookRoot, failedOnly, jsonOutput };
}

function getTier(totalWords) {
  if (totalWords <= 30000) return { name: 'S', minPerChapter: 1500 };
  if (totalWords <= 100000) return { name: 'M', minPerChapter: 2000 };
  if (totalWords <= 1000000) return { name: 'L', minPerChapter: 2500 };
  return { name: 'XL', minPerChapter: 3000 };
}

// Count only Chinese characters (Han ideographs)
function countChineseChars(text) {
  const matches = text.match(/[\u4e00-\u9fff]/g);
  return matches ? matches.length : 0;
}

async function main() {
  const { bookRoot, failedOnly, jsonOutput } = parseArgs();

  if (!bookRoot || !fs.existsSync(bookRoot)) {
    console.error('❌ 错误：请指定有效的 --book-root');
    process.exit(1);
  }

  // Read project config for target word count
  const configPath = path.join(bookRoot, '.fbs', 'project-config.json');
  let targetWordCount = 100000; // default fallback
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.targetWordCount) {
        targetWordCount = parseInt(config.targetWordCount);
      }
    } catch (e) {
      // ignore parse errors, use default
    }
  }

  const tier = getTier(targetWordCount);
  const chaptersDir = path.join(bookRoot, 'chapters');
  
  if (!fs.existsSync(chaptersDir)) {
    console.error('❌ 错误：未找到 chapters/ 目录');
    process.exit(1);
  }

  // Find all chapter files sorted
  const files = fs.readdirSync(chaptersDir)
    .filter(f => f.match(/S3-Ch\d{2}-.+\.md$/))
    .sort();

  if (files.length === 0) {
    console.error('❌ 错误：chapters/ 目录为空或未找到章节文件');
    process.exit(1);
  }

  // Process each chapter
  const results = [];
  let totalChars = 0;
  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(chaptersDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const chineseCount = countChineseChars(content);
    const chapterNum = file.match(/Ch(\d+)/)?.[1] || '??';
    
    // Extract title from first heading
    const titleMatch = content.match(/^#\s+.+?第\d+章\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : file;
    const deficit = Math.max(0, tier.minPerChapter - chineseCount);

    results.push({
      chapter: parseInt(chapterNum),
      file,
      title,
      chineseCount,
      deficit,
      passed: chineseCount >= tier.minPerChapter
    });

    totalChars += chineseCount;
    if (chineseCount >= tier.minPerChapter) passed++;
    else failed++;
  }

  // Sort by chapter number
  results.sort((a, b) => a.chapter - b.chapter);

  const totalTarget = files.length * tier.minPerChapter;
  const totalDeficit = totalTarget - totalChars;

  // Output
  if (jsonOutput) {
    const report = {
      tier: tier.name,
      minPerChapter: tier.minPerChapter,
      totalChapters: files.length,
      passed,
      failed,
      totalChineseChars: totalChars,
      targetTotalChars: totalTarget,
      totalDeficit: Math.max(0, totalDeficit),
      results
    };
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Human-readable output
  console.log('\n📏 字数审计报告');
  console.log(`档位：${tier.name}（每章 ≥ ${tier.minPerChapter} 汉字）`);
  console.log(`总章数：${files.length}`);
  console.log(`✅ 达标：${passed} 章`);
  console.log(`⚠️  未达标：${failed} 章`);
  console.log(`总汉字数：${totalChars.toLocaleString()}`);
  console.log(`目标总字数：${totalTarget.toLocaleString()}（${files.length}×${tier.minPerChapter}）`);
  console.log(`差额：${totalDeficit > 0 ? '-' : ''}${Math.abs(totalDeficit).toLocaleString()} 汉字\n`);

  if (failedOnly) {
    const failedChapters = results.filter(r => !r.passed).sort((a, b) => a.deficit - b.deficit);
    console.log(`最薄弱的 ${Math.min(10, failedChapters.length)} 章（欠字最多 → 少）：`);
    for (const r of failedChapters.slice(-10).reverse()) {
      console.log(`  Ch${String(r.chapter).padStart(2, ' ')} ${r.title.padEnd(12)} ${String(r.chineseCount).padStart(5)}字  ❌ 距达标差${r.deficit}字`);
    }
    console.log();
    return;
  }

  // Full table
  console.log('章节字数明细：');
  console.log('─'.repeat(60));
  for (const r of results) {
    const icon = r.passed ? '✅' : '⚠️';
    const pct = Math.round(r.chineseCount / tier.minPerChapter * 100);
    const status = r.passed ? `达标`.padStart(8) : `差${r.deficit}字`.padStart(8);
    console.log(`  Ch${String(r.chapter).padStart(2, ' ')} ${icon} ${String(r.chineseCount).padStart(5)}字  ${String(pct).padStart(3)}%  ${status}`);
  }
  console.log('─'.repeat(60));

  if (totalDeficit > 0) {
    console.log(`\n💡 建议：从欠字数最多的章节开始扩充`);
    console.log(`   审计命令：node scripts/chapter-wordcount-audit.mjs --failed-only`);
  } else {
    console.log(`\n🎉 全部章节字数达标！`);
  }
  console.log();
}

main().catch(err => {
  console.error('❌ 审计脚本异常：', err.message);
  process.exit(1);
});
