#!/usr/bin/env node
/**
 * OpenClaw 结果格式化适配器
 * 将脚本输出转换为 OpenClaw 兼容格式
 *
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── 格式化类型 ───────────────────────────────────────────────────────────────

/**
 * 结果格式化选项
 */
export const FORMAT_OPTIONS = {
  // 输出格式
  MARKDOWN: 'markdown',
  HTML: 'html',
  JSON: 'json',
  TEXT: 'text',

  // 详细程度
  VERBOSE: 'verbose',
  NORMAL: 'normal',
  BRIEF: 'brief',

  // 是否静默
  SILENT: 'silent',
};

// ── 格式化函数 ───────────────────────────────────────────────────────────────

/**
 * 格式化脚本结果为统一格式
 * @param {Object} result - 脚本原始结果
 * @param {Object} options - 格式化选项
 * @returns {Object} 格式化后的结果
 */
export function formatScriptResult(result, options = {}) {
  const {
    format = FORMAT_OPTIONS.JSON,
    verbosity = FORMAT_OPTIONS.NORMAL,
    includeRaw = false,
  } = options;

  // 基础结果对象
  const formatted = {
    success: result.success ?? result.error == null,
    timestamp: new Date().toISOString(),
    channel: 'openclaw',
  };

  // 根据详细程度添加字段
  if (verbosity === FORMAT_OPTIONS.VERBOSE) {
    formatted.details = result.details || {};
    formatted.metadata = result.metadata || {};
  }

  if (verbosity === FORMAT_OPTIONS.NORMAL) {
    formatted.message = result.message || result.summary || '';
    formatted.data = result.data || null;
  }

  if (verbosity === FORMAT_OPTIONS.BRIEF) {
    formatted.summary = result.summary || result.message || '';
  }

  // 错误处理
  if (result.error) {
    formatted.error = {
      code: result.code || 'UNKNOWN',
      message: result.message || String(result.error),
      suggestion: result.suggestion || null,
    };
  }

  // 可选：包含原始结果
  if (includeRaw) {
    formatted._raw = result;
  }

  return formatted;
}

/**
 * 格式化会话恢复信息
 * @param {Object} resume - session-resume.json 内容
 * @returns {Object} 格式化后的恢复信息
 */
export function formatSessionResume(resume) {
  if (!resume) {
    return {
      exists: false,
      canResume: false,
      message: '无可用会话',
    };
  }

  return {
    exists: true,
    canResume: true,
    lastAction: resume.lastAction || '未知',
    nextRecommendations: resume.nextRecommendations || [],
    wordCount: resume.wordCount || 0,
    chapterCount: resume.chapterCount || 0,
    completedCount: resume.completedCount || 0,
    phase: resume.phase || resume.currentPhase || 'unknown',
    modifiedFiles: resume.modifiedFiles || [],
    timestamp: resume.timestamp || resume.updatedAt || null,
  };
}

/**
 * 格式化章节状态
 * @param {string} statusPath - chapter-status.md 路径
 * @returns {Object} 格式化后的章节状态
 */
export function formatChapterStatus(statusPath) {
  if (!fs.existsSync(statusPath)) {
    return {
      exists: false,
      chapters: [],
      total: 0,
      completed: 0,
    };
  }

  try {
    const content = fs.readFileSync(statusPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());

    const chapters = [];
    let completed = 0;

    for (const line of lines) {
      // 匹配章节行：# 第X章 或 ## X.X 标题
      const chapterMatch = line.match(/^(#{1,3})\s+(.+)/);
      if (chapterMatch) {
        const level = chapterMatch[1].length;
        const title = chapterMatch[2].trim();

        // 提取状态字符（如果存在）
        const statusMatch = line.match(/\[([WwDd])\]/);
        const status = statusMatch ? statusMatch[1].toUpperCase() : 'W';

        const chapter = {
          title,
          level,
          status,
          completed: status === 'D',
        };

        if (status === 'D') completed++;
        chapters.push(chapter);
      }
    }

    return {
      exists: true,
      chapters,
      total: chapters.length,
      completed,
      inProgress: chapters.length - completed,
      progressPercent: chapters.length > 0
        ? Math.round((completed / chapters.length) * 100)
        : 0,
    };
  } catch (error) {
    return {
      exists: true,
      error: true,
      message: '无法解析章节状态',
    };
  }
}

/**
 * 格式化用户可见的简短回复
 * @param {Object} result - 脚本结果
 * @returns {string} 用户可见的简短内容
 */
export function formatUserFacingOneLiner(result) {
  // 优先使用 userFacingOneLiner
  if (result.userFacingOneLiner) {
    return result.userFacingOneLiner;
  }

  // 其次使用 userMessage
  if (result.userMessage) {
    return result.userMessage;
  }

  // 使用 summary
  if (result.summary) {
    return result.summary;
  }

  // 使用 message
  if (result.message) {
    return result.message;
  }

  // 默认
  return '操作完成';
}

/**
 * 格式化选项提示（primaryOptionsHint）
 * @param {Array} options - 选项数组
 * @param {number} maxOptions - 最大显示数量
 * @returns {string} 格式化的选项提示
 */
export function formatPrimaryOptionsHint(options, maxOptions = 3) {
  if (!options || !Array.isArray(options) || options.length === 0) {
    return null;
  }

  const limited = options.slice(0, maxOptions);
  return limited.join(' / ');
}

/**
 * 格式化错误消息为中文
 * @param {Error|string} error - 错误对象或字符串
 * @returns {Object} 格式化的错误对象
 */
export function formatErrorMessage(error) {
  const errorStr = error instanceof Error ? error.message : String(error);
  const errorCode = error instanceof Error ? error.code : null;

  // 错误代码到中文消息的映射
  const ERROR_MESSAGES = {
    'ENOENT': '文件或目录不存在',
    'ECONNREFUSED': '网络连接被拒绝',
    'ETIMEDOUT': '网络连接超时',
    'MODULE_NOT_FOUND': '缺少必要的依赖模块',
    'ERR_MISSING_ARGS': '缺少必要的参数',
    'ERR_LAUNCH_FAILED': '程序启动失败',
  };

  return {
    code: errorCode || 'UNKNOWN',
    message: ERROR_MESSAGES[errorCode] || errorStr,
    suggestion: ERROR_MESSAGES[errorCode]
      ? `请检查相关配置或文件是否存在`
      : null,
  };
}

/**
 * 格式化进度条（用于 S3 写稿阶段）
 * @param {number} current - 当前完成数
 * @param {number} total - 总数
 * @param {number} estimatedMinutes - 预计剩余分钟数
 * @returns {string} 格式化的进度字符串
 */
export function formatProgressBar(current, total, estimatedMinutes) {
  const PROGRESS_BAR_WIDTH = 20;
  const filled = Math.round((current / total) * PROGRESS_BAR_WIDTH);
  const empty = PROGRESS_BAR_WIDTH - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.round((current / total) * 100);

  return `${current}/${total}章完成 ${bar} ${percent}% 预计还需：${estimatedMinutes}分钟`;
}

// ── 输出目标适配 ────────────────────────────────────────────────────────────

/**
 * 确定结果输出目标
 * @param {Object} result - 脚本结果
 * @returns {Object} 输出目标配置
 */
export function resolveOutputTarget(result) {
  // 如果已有 presentation 定义，优先使用
  if (result.presentation) {
    return {
      type: 'presentation',
      ...result.presentation,
    };
  }

  // 检查是否有文件路径
  if (result.filePath || result.outputPath) {
    const filePath = result.filePath || result.outputPath;
    const ext = path.extname(filePath).toLowerCase();

    return {
      type: 'file',
      path: filePath,
      format: ext.slice(1), // 去掉点
      tool: ['.pdf', '.html'].includes(ext) ? 'preview_url' : 'open_result_view',
    };
  }

  // 默认返回消息
  return {
    type: 'message',
    tool: 'direct',
  };
}

// ── CLI 入口 ────────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('result-formatter.mjs')) {
  const args = process.argv.slice(2);

  if (args[0] === 'progress') {
    // 测试进度条格式化
    const current = parseInt(args[1]) || 0;
    const total = parseInt(args[2]) || 10;
    const minutes = parseInt(args[3]) || 5;
    console.log(formatProgressBar(current, total, minutes));
  } else if (args[0] === 'error') {
    // 测试错误格式化
    const err = { code: args[1] || 'ENOENT', message: args[2] || 'test error' };
    console.log(JSON.stringify(formatErrorMessage(err), null, 2));
  } else {
    console.log('用法:');
    console.log('  node result-formatter.mjs progress <current> <total> <minutes>');
    console.log('  node result-formatter.mjs error <code> <message>');
  }
}
