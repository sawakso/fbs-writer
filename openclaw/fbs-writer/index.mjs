#!/usr/bin/env node
/**
 * OpenClaw 适配层索引
 * 统一导出所有适配器功能
 *
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 */

import * as contextMapper from './adapter/context-mapper.mjs';
import * as resultFormatter from './adapter/result-formatter.mjs';

// ── 导出上下文映射器 ─────────────────────────────────────────────────────────

export {
  contextMapper,
  resultFormatter,
};

// ── 便捷别名 ────────────────────────────────────────────────────────────────

/**
 * 上下文映射快捷函数
 */
export const mapContext = {
  /**
   * WorkBuddy → OpenClaw
   */
  toOpenClaw: contextMapper.mapWorkBuddyToOpenClaw,

  /**
   * OpenClaw → WorkBuddy
   */
  toWorkBuddy: contextMapper.mapOpenClawToWorkBuddy,

  /**
   * 规范化意图
   */
  normalizeIntent: contextMapper.normalizeIntent,

  /**
   * 规范化阶段
   */
  normalizePhase: contextMapper.normalizePhase,
};

/**
 * 结果格式化快捷函数
 */
export const formatResult = {
  /**
   * 格式化脚本结果
   */
  script: resultFormatter.formatScriptResult,

  /**
   * 格式化会话恢复信息
   */
  resume: resultFormatter.formatSessionResume,

  /**
   * 格式化章节状态
   */
  chapterStatus: resultFormatter.formatChapterStatus,

  /**
   * 格式化用户可见内容
   */
  userFacing: resultFormatter.formatUserFacingOneLiner,

  /**
   * 格式化选项提示
   */
  optionsHint: resultFormatter.formatPrimaryOptionsHint,

  /**
   * 格式化错误消息
   */
  error: resultFormatter.formatErrorMessage,

  /**
   * 格式化进度条
   */
  progress: resultFormatter.formatProgressBar,

  /**
   * 确定输出目标
   */
  outputTarget: resultFormatter.resolveOutputTarget,
};

/**
 * 格式化选项常量
 */
export { FORMAT_OPTIONS } from './adapter/result-formatter.mjs';

// ── 版本信息 ────────────────────────────────────────────────────────────────

export const ADAPTER_VERSION = '2.1.2';
export const ADAPTER_NAME = 'fbs-bookwriter-lrz-openclaw-adapter';

// ── CLI 入口 ────────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('index.mjs')) {
  console.log('OpenClaw 适配层索引');
  console.log('─'.repeat(40));
  console.log(`版本: ${ADAPTER_VERSION}`);
  console.log(`模块数: 2`);
  console.log('');
  console.log('导出模块:');
  console.log('  - contextMapper: 上下文映射器');
  console.log('  - resultFormatter: 结果格式化器');
  console.log('');
  console.log('快捷函数:');
  console.log('  - mapContext: 上下文映射');
  console.log('  - formatResult: 结果格式化');
}
