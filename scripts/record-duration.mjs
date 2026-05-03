#!/usr/bin/env node
/**
 * record-duration.mjs
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 *
 * 功能：记录每章写稿耗时，按项目类型（小说/白皮书/报道）分别统计
 *       用真实数据校准预估时间，越用越准
 *
 * 用法：
 *   开始计时：node scripts/record-duration.mjs --action start --chapter 42 --book-root <书稿根目录>
 *   结束计时：node scripts/record-duration.mjs --action end   --chapter 42 --book-root <书稿根目录>
 *   查看统计：node scripts/record-duration.mjs --action show  --book-root <书稿根目录>
 *
 * 原理：
 *   start 时记录当前时间戳到 `.fbs/_timing/{chapter}.start`
 *   end   时读取时间戳，计算耗时（秒），写入 `.fbs/time-tracking.json`
 *   自动读取 project-config.json 的 genreTag 作为项目类型
 *   平均值按"项目类型 + 模式（扩写/新写）"分组
 *   够3条记录才启用实际平均值，避免偶然偏差
 *
 * 数据文件结构（.fbs/time-tracking.json）：
 *   {
 *     "records": [
 *       {
 *         "chapter": 42,
 *         "mode": "expansion",
 *         "projectType": "现实题材-成长小说",
 *         "duration": 180,
 *         "oldChars": 850,
 *         "newChars": 3107
 *       }
 *     ],
 *     "averagesByType": {
 *       "现实题材-成长小说": {
 *         "expansion": 192,      // 够3条后的实际平均秒数
 *         "new_write": null       // 不够3条则为 null
 *       }
 *     },
 *     "fallback": {              // 无数据时的回退值
 *       "expansion": 150,       // 扩写：2.5分钟
 *       "new_write": 90         // 新写：1.5分钟
 *     }
 *   }
 */

import fs from 'fs';
import path from 'path';

// ===== 参数解析 =====
function parseArgs() {
  const args = process.argv.slice(2);
  let action = null;      // 'start'、'end' 或 'show'
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
  node scripts/record-duration.mjs --action show  --book-root <路径>`);
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

function getProjectConfigPath(bookRoot) {
  return path.join(bookRoot, '.fbs', 'project-config.json');
}

// ===== 读取项目类型 =====
// 从 project-config.json 的 genreTag 字段获取项目类型
// 如果读取失败或字段不存在，返回 'unknown'
function readProjectType(bookRoot) {
  try {
    const configPath = getProjectConfigPath(bookRoot);
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.genreTag || 'unknown';
    }
  } catch {
    // 配置文件不存在或解析失败，不影响主流程
  }
  return 'unknown';
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
      averagesByType: {},
      fallback: {
        expansion: 150,
        new_write: 90
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

// ===== 重新计算各项目类型 + 各模式的平均耗时 =====
function recalcAverages(tracking) {
  // 按 projectType + mode 分组
  const groups = {};

  for (const r of tracking.records) {
    // 只使用有完整 duration 的记录
    if (!r.duration) continue;

    const key = `${r.projectType || 'unknown'}::${r.mode}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r.duration);
  }

  // 重算 averagesByType
  tracking.averagesByType = {};

  for (const [key, durations] of Object.entries(groups)) {
    const [projectType, mode] = key.split('::');

    // 初始化该类型的对象
    if (!tracking.averagesByType[projectType]) {
      tracking.averagesByType[projectType] = { expansion: null, new_write: null };
    }

    // 够3条记录才算平均值，避免单次偶然偏差
    if (durations.length >= 3) {
      const sum = durations.reduce((a, b) => a + b, 0);
      tracking.averagesByType[projectType][mode] = Math.round(sum / durations.length);
    }
  }
}

// ===== 获取当前某章字数 =====
function getChapterCharCount(bookRoot, chapter) {
  const chaptersDir = path.join(bookRoot, 'chapters');
  if (!fs.existsSync(chaptersDir)) return null;

  const files = fs.readdirSync(chaptersDir);
  // 匹配多种命名格式：S3-Ch42-*.md、42-*.md、第42章-*.md
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

// ===== 获取某项目类型 + 模式下的平均耗时 =====
// 优先用该类型的实际平均数据；如果记录不足，回退到全局 fallback
function getAverageDuration(tracking, projectType, mode) {
  const typeData = tracking.averagesByType[projectType];
  if (typeData && typeData[mode]) {
    return typeData[mode];
  }
  // 无数据或记录不足时用 fallback
  return tracking.fallback[mode] || 150;
}

// ===== 统计某类型的记录条数 =====
function countRecordsByType(tracking, projectType, mode) {
  return tracking.records.filter(
    r => r.projectType === projectType && r.mode === mode
  ).length;
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
    // 用 date +%s 的秒级时间戳，精确且跨会话可靠
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

    // 计算耗时（秒）
    const startTime = parseInt(fs.readFileSync(startFile, 'utf-8').trim(), 10);
    const endTime = Math.floor(Date.now() / 1000);
    const duration = endTime - startTime;

    // 获取项目类型和字数信息
    const projectType = readProjectType(bookRoot);
    const currentChars = getChapterCharCount(bookRoot, chapter);
    const mode = detectMode(bookRoot, chapter);

    // 读取已有的 tracking 数据
    const tracking = loadTracking(bookRoot);
    const prevRecord = tracking.records.find(r => r.chapter === chapter);
    const oldChars = prevRecord ? prevRecord.newChars : null;

    // 创建记录
    const record = {
      chapter,
      mode,
      projectType,
      duration,
      timestamp: new Date().toISOString()
    };
    if (currentChars !== null) record.newChars = currentChars;
    if (oldChars !== null) record.oldChars = oldChars;

    // 替换或追加记录
    const existingIdx = tracking.records.findIndex(r => r.chapter === chapter);
    if (existingIdx >= 0) {
      tracking.records[existingIdx] = record;
    } else {
      tracking.records.push(record);
    }

    // 重算按类型的平均值
    recalcAverages(tracking);
    saveTracking(bookRoot, tracking);

    // 清理开始标记文件
    fs.unlinkSync(startFile);

    // 输出摘要
    const avgVal = getAverageDuration(tracking, projectType, mode);
    const typeRecordCount = countRecordsByType(tracking, projectType, mode);
    const minutes = (duration / 60).toFixed(1);
    const typeLabel = mode === 'expansion' ? '扩写平均' : '新写平均';
    console.log(`✅ 第${chapter}章完成 | 耗时: ${duration}秒 (${minutes}分钟)`);
    console.log(`📊 项目类型: ${projectType} | ${typeLabel}: ${avgVal}秒 (${typeRecordCount}条记录)`);

  } else if (action === 'show') {
    // ===== SHOW：展示当前预估数据 =====
    const tracking = loadTracking(bookRoot);
    const projectType = readProjectType(bookRoot);

    // 无记录时直接显示回退值
    if (tracking.records.length === 0) {
      console.log('📊 暂无耗时记录，将使用回退值预估');
      console.log(`   ${projectType} 扩写: ${tracking.fallback.expansion}秒/章`);
      console.log(`   ${projectType} 新写: ${tracking.fallback.new_write}秒/章`);
      process.exit(0);
    }

    // 提取所有出现的项目类型
    const types = [...new Set(tracking.records.map(r => r.projectType || 'unknown'))];
    console.log(`📊 耗时统计（${projectType}）:`);

    for (const type of types) {
      const typeData = tracking.averagesByType[type];
      console.log(`\n  📂 ${type}:`);
      for (const mode of ['expansion', 'new_write']) {
        const count = countRecordsByType(tracking, type, mode);
        const label = mode === 'expansion' ? '扩写' : '新写';
        const actual = typeData ? typeData[mode] : null;
        const fallback = tracking.fallback[mode];

        if (actual) {
          console.log(`    ✅ ${label}: ${actual}秒/章 (基于${count}条记录)`);
        } else if (count > 0) {
          console.log(`    ⏳ ${label}: ${count}条记录，不足3条，暂用回退值 ${fallback}秒`);
        } else {
          console.log(`    ⏳ ${label}: 无记录，暂用回退值 ${fallback}秒`);
        }
      }
    }

    console.log(`\n  总记录数: ${tracking.records.length}`);
    // 显示最近3条记录
    console.log('  最近记录:');
    const recent = tracking.records.slice(-3).reverse();
    for (const r of recent) {
      const mins = (r.duration / 60).toFixed(1);
      const label = r.mode === 'expansion' ? '扩写' : '新写';
      const type = r.projectType || '未知类型';
      console.log(`    第${r.chapter}章 ${label} [${type}] ${r.duration}秒 (${mins}分钟)`);
    }
  }
}

main();
