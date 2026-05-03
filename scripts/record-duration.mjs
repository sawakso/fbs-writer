#!/usr/bin/env node
/**
 * record-duration.mjs
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 *
 * 功能：记录每章写稿耗时，用真实数据校准预估时间
 *
 * 用法：
 *   开始计时：node scripts/record-duration.mjs --action start --chapter 42 --book-root <书稿根目录>
 *   结束计时：node scripts/record-duration.mjs --action end   --chapter 42 --book-root <书稿根目录>
 *
 * 原理：
 *   start 时记录当前时间戳到 `.fbs/_timing/{chapter}.start`
 *   end   时读取时间戳，计算耗时（秒），写入 `.fbs/time-tracking.json`
 *   每次写入后重算各模式下的平均耗时，供 S3 入口预检使用
 *
 * 数据文件结构（.fbs/time-tracking.json）：
 *   {
 *     "records": [
 *       { "chapter": 42, "mode": "expansion", "duration": 180, "oldChars": 850, "newChars": 3107 }
 *     ],
 *     "averages": {
 *       "expansion": null,       // 扩写模式平均秒数，够3条记录后才算
 *       "new_write": null,       // 新写模式平均秒数，够3条记录后才算
 *       "fallback": {            // 无数据时的回退值
 *         "expansion": 150,      // 扩写：2.5分钟
 *         "new_write": 90        // 新写：1.5分钟
 *       }
 *     }
 *   }
 */

import fs from 'fs';
import path from 'path';

// ===== 参数解析 =====
function parseArgs() {
  const args = process.argv.slice(2);
  let action = null;      // 'start' 或 'end'
  let chapter = null;     // 章节号
  let bookRoot = null;    // 书稿根目录

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--action':
        action = args[++i];
        break;
      case '--chapter':
        chapter = parseInt(args[++i], 10);
        break;
      case '--book-root':
        bookRoot = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`用法：
  node scripts/record-duration.mjs --action start --chapter 42 --book-root <路径>
  node scripts/record-duration.mjs --action end   --chapter 42 --book-root <路径>
  node scripts/record-duration.mjs --show         --book-root <路径>`);
        process.exit(0);
    }
  }

  if (!action || !bookRoot) {
    console.error('错误：需要 --action (start|end|show) 和 --book-root 参数');
    process.exit(1);
  }

  if (!['start', 'end', 'show'].includes(action)) {
    console.error('错误：--action 必须是 start、end 或 show');
    process.exit(1);
  }

  // start 和 end 需要 --chapter，show 不需要
  if ((action === 'start' || action === 'end') && !chapter) {
    console.error('错误：start 和 end 操作需要 --chapter 参数');
    process.exit(1);
  }

  return { action, chapter, bookRoot };
}

// ===== 文件路径辅助 =====
function getTimingDir(bookRoot) {
  return path.join(bookRoot, '.fbs', '_timing');
}

function getStartFilePath(bookRoot, chapter) {
  return path.join(getTimingDir(bookRoot), `${chapter}.start`);
}

function getTrackingFilePath(bookRoot) {
  return path.join(bookRoot, '.fbs', 'time-tracking.json');
}

// ===== 读取/初始化 time-tracking.json =====
function loadTracking(bookRoot) {
  const filePath = getTrackingFilePath(bookRoot);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    // 文件不存在或解析失败，返回默认结构
    return {
      records: [],
      averages: {
        expansion: null,
        new_write: null,
        fallback: {
          expansion: 150,
          new_write: 90
        }
      }
    };
  }
}

// ===== 保存 time-tracking.json =====
function saveTracking(bookRoot, data) {
  const filePath = getTrackingFilePath(bookRoot);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ===== 重新计算各模式平均耗时 =====
function recalcAverages(tracking) {
  const modes = { expansion: [], new_write: [] };

  // 按模式分组，只取有 oldChars 和 newChars 的完整记录
  for (const r of tracking.records) {
    if (r.mode === 'expansion' && r.duration && r.oldChars !== undefined) {
      modes.expansion.push(r.duration);
    } else if (r.mode === 'new_write' && r.duration) {
      modes.new_write.push(r.duration);
    }
  }

  // 够3条记录才算平均值，避免偶然偏差
  for (const [mode, durations] of Object.entries(modes)) {
    if (durations.length >= 3) {
      const sum = durations.reduce((a, b) => a + b, 0);
      tracking.averages[mode] = Math.round(sum / durations.length);
    }
    // 不够3条时保持 null，SKILL 会自动用 fallback 值
  }
}

// ===== 获取当前某章字数（用于记录扩写前后变化）=====
function getChapterCharCount(bookRoot, chapter) {
  // 尝试匹配 S3-Ch{编号}-*.md 文件
  const chaptersDir = path.join(bookRoot, 'chapters');
  if (!fs.existsSync(chaptersDir)) return null;

  const files = fs.readdirSync(chaptersDir);
  // 匹配两种命名格式：S3-Ch42-*.md 或 42-*.md 或 第42章-*.md
  const pattern = new RegExp(`(?:S3-)?Ch?${chapter}[-_\u4e00-\u9fff]`, 'i');
  const match = files.find(f => pattern.test(f));
  if (!match) return null;

  const content = fs.readFileSync(path.join(chaptersDir, match), 'utf-8');
  // 统计纯中文字符
  const chineseChars = content.match(/[\u4e00-\u9fff]/g);
  return chineseChars ? chineseChars.length : 0;
}

// ===== 判断操作模式：扩写还是新写 =====
function detectMode(bookRoot, chapter) {
  const chaptersDir = path.join(bookRoot, 'chapters');
  if (!fs.existsSync(chaptersDir)) return 'new_write';

  const files = fs.readdirSync(chaptersDir);
  const pattern = new RegExp(`(?:S3-)?Ch?${chapter}[-_\u4e00-\u9fff]`, 'i');
  return files.some(f => pattern.test(f)) ? 'expansion' : 'new_write';
}

// ===== 获取平均耗时（优先实际数据，无数据则用 fallback）=====
function getAverageDuration(tracking, mode) {
  // 优先用实际平均值
  if (tracking.averages[mode]) {
    return tracking.averages[mode];
  }
  // 无数据时用 fallback
  return tracking.averages.fallback[mode] || 150;
}

// ===== 主逻辑 =====
function main() {
  const { action, chapter, bookRoot } = parseArgs();
  const timingDir = getTimingDir(bookRoot);

  if (action === 'start') {
    // ===== START：记录开始时间 =====
    if (!fs.existsSync(timingDir)) {
      fs.mkdirSync(timingDir, { recursive: true });
    }
    const now = Math.floor(Date.now() / 1000);
    fs.writeFileSync(getStartFilePath(bookRoot, chapter), String(now), 'utf-8');
    const mode = detectMode(bookRoot, chapter);
    console.log(`📝 第${chapter}章 ${mode === 'expansion' ? '扩写' : '新写'} 开始`);

  } else if (action === 'end') {
    // ===== END：计算耗时，写入记录 =====
    const startFile = getStartFilePath(bookRoot, chapter);
    if (!fs.existsSync(startFile)) {
      console.error(`⚠️ 未找到第${chapter}章的计时开始记录（${startFile}），无法计算耗时`);
      process.exit(1);
    }

    // 计算耗时
    const startTime = parseInt(fs.readFileSync(startFile, 'utf-8').trim(), 10);
    const endTime = Math.floor(Date.now() / 1000);
    const duration = endTime - startTime;

    // 获取字数信息
    const currentChars = getChapterCharCount(bookRoot, chapter);
    const mode = detectMode(bookRoot, chapter);

    // 如果是扩写模式，尝试读取之前的字数（从 tracking 记录中查找）
    const tracking = loadTracking(bookRoot);
    const prevRecord = tracking.records.find(r => r.chapter === chapter);
    const oldChars = prevRecord ? prevRecord.newChars : null;

    // 创建新记录
    const record = {
      chapter,
      mode,
      duration,
      timestamp: new Date().toISOString()
    };
    if (currentChars !== null) record.newChars = currentChars;
    if (oldChars !== null) record.oldChars = oldChars;

    // 追加入总记录
    // 如果已有同章节记录则替换（防止重复计时）
    const existingIdx = tracking.records.findIndex(r => r.chapter === chapter);
    if (existingIdx >= 0) {
      tracking.records[existingIdx] = record;
    } else {
      tracking.records.push(record);
    }

    // 重算平均值
    recalcAverages(tracking);

    // 保存
    saveTracking(bookRoot, tracking);

    // 清理开始标记文件
    fs.unlinkSync(startFile);

    // 输出摘要
    const avgLabel = mode === 'expansion' ? '扩写平均' : '新写平均';
    const avgVal = getAverageDuration(tracking, mode);
    const minutes = (duration / 60).toFixed(1);
    console.log(`✅ 第${chapter}章完成 | 耗时: ${duration}秒 (${minutes}分钟) | ${avgLabel}: ${avgVal}秒`);
    console.log(`📊 已有 ${tracking.records.length} 条记录`);

  } else if (action === 'show') {
    // ===== SHOW：展示当前预估数据 =====
    const tracking = loadTracking(bookRoot);
    if (tracking.records.length === 0) {
      console.log('📊 暂无耗时记录，将使用回退值预估');
      console.log(`   扩写: ${tracking.averages.fallback.expansion}秒/章`);
      console.log(`   新写: ${tracking.averages.fallback.new_write}秒/章`);
      process.exit(0);
    }

    console.log('📊 耗时统计：');
    for (const mode of ['expansion', 'new_write']) {
      const actual = tracking.averages[mode];
      const fallback = tracking.averages.fallback[mode];
      const label = mode === 'expansion' ? '扩写' : '新写';
      if (actual) {
        console.log(`  ✅ ${label}平均: ${actual}秒 (回退值: ${fallback}秒)`);
      } else {
        console.log(`  ⏳ ${label}: 记录不足3条，暂用回退值 ${fallback}秒`);
      }
    }
    console.log(`  总记录数: ${tracking.records.length}`);
    // 显示最近的5条记录
    console.log('  最近记录:');
    const recent = tracking.records.slice(-5).reverse();
    for (const r of recent) {
      const mins = (r.duration / 60).toFixed(1);
      const label = r.mode === 'expansion' ? '扩写' : '新写';
      console.log(`    第${r.chapter}章 ${label} ${r.duration}秒 (${mins}分钟)`);
    }
  }
}

main();
