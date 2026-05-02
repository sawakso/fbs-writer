#!/usr/bin/env node
/**
 * OpenClaw 上下文映射器
 * WorkBuddy ↔ OpenClaw 上下文转换
 *
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILL_ROOT = path.resolve(__dirname, '..', '..');

// ── 上下文类型定义 ───────────────────────────────────────────────────────────

/**
 * WorkBuddy 上下文字段 → OpenClaw 上下文字段 映射表
 */
export const CONTEXT_FIELD_MAP = {
  // WorkBuddy 字段 → OpenClaw 字段
  'userProfile': 'user_profile',
  'sessionMemory': 'memory',
  'workspaceMemory': 'memory',
  'skillContext': 'skill_context',
  'toolResults': 'tool_output',
};

// ── 上下文转换函数 ───────────────────────────────────────────────────────────

/**
 * 将 WorkBuddy 格式的上下文转换为 OpenClaw 格式
 * @param {Object} wbContext - WorkBuddy 上下文
 * @returns {Object} OpenClaw 格式上下文
 */
export function mapWorkBuddyToOpenClaw(wbContext = {}) {
  const result = {
    // 基本信息透传
    bookRoot: wbContext.bookRoot || process.cwd(),
    skillRoot: SKILL_ROOT,
    channel: 'openclaw',

    // 记忆系统映射
    memory: mapMemoryFields(wbContext),

    // 画像映射
    userProfile: mapUserProfile(wbContext.userProfile),

    // 工具结果
    toolOutput: wbContext.toolResults || wbContext.tool_output || {},

    // 阶段信息
    phase: wbContext.phase || wbContext.currentPhase || 'unknown',
    chapterIndex: wbContext.chapterIndex || wbContext.chapter_index || 0,

    // 扩展字段（保留原始数据）
    _raw: wbContext,
  };

  return result;
}

/**
 * 将 OpenClaw 格式的上下文转换为 WorkBuddy 格式
 * @param {Object} ocContext - OpenClaw 上下文
 * @returns {Object} WorkBuddy 格式上下文
 */
export function mapOpenClawToWorkBuddy(ocContext = {}) {
  const result = {
    // 基本信息透传
    bookRoot: ocContext.bookRoot || process.cwd(),
    skillRoot: ocContext.skillRoot || SKILL_ROOT,
    channel: 'openclaw',

    // 记忆系统映射（反向）
    sessionMemory: ocContext.memory,
    workspaceMemory: ocContext.memory,

    // 画像映射
    userProfile: mapUserProfileFromOpenClaw(ocContext.userProfile),

    // 阶段信息
    phase: ocContext.phase,
    currentPhase: ocContext.phase,
    chapterIndex: ocContext.chapterIndex,

    // 扩展字段
    _raw: ocContext,
  };

  return result;
}

// ── 字段映射辅助函数 ─────────────────────────────────────────────────────────

/**
 * 映射记忆相关字段
 */
function mapMemoryFields(context) {
  // 优先使用 session-resume.json
  const bookRoot = context.bookRoot || process.cwd();
  const resumePath = path.join(bookRoot, '.fbs', 'session-resume.json');

  if (fs.existsSync(resumePath)) {
    try {
      const resume = JSON.parse(fs.readFileSync(resumePath, 'utf8'));
      return {
        resume,
        lastAction: resume.lastAction,
        nextRecommendations: resume.nextRecommendations,
        wordCount: resume.wordCount,
        chapterCount: resume.chapterCount,
        completedCount: resume.completedCount,
      };
    } catch {
      // 忽略解析错误
    }
  }

  // 回退到上下文中的 memory 字段
  return context.memory || context.sessionMemory || {};
}

/**
 * 映射用户画像（WorkBuddy → OpenClaw）
 */
function mapUserProfile(wbProfile) {
  if (!wbProfile) return null;

  return {
    name: wbProfile.basicInfo?.name || wbProfile.name,
    callName: wbProfile.basicInfo?.callName || wbProfile.callName,
    city: wbProfile.basicInfo?.city || wbProfile.city,
    pronouns: wbProfile.basicInfo?.pronouns || wbProfile.pronouns,
    preferences: wbProfile.preferences,
    workContext: wbProfile.workContext,
  };
}

/**
 * 映射用户画像（OpenClaw → WorkBuddy 格式）
 */
function mapUserProfileFromOpenClaw(ocProfile) {
  if (!ocProfile) return null;

  return {
    basicInfo: {
      name: ocProfile.name,
      callName: ocProfile.callName,
      city: ocProfile.city,
      pronouns: ocProfile.pronouns,
    },
    preferences: ocProfile.preferences,
    workContext: ocProfile.workContext,
  };
}

// ── 意图映射 ────────────────────────────────────────────────────────────────

/**
 * 意图别名映射表
 */
export const INTENT_ALIASES = {
  // 中文 → 英文
  '写书': 'book',
  '出书': 'book',
  '写长篇': 'novel',
  '写手册': 'manual',
  '写白皮书': 'whitepaper',
  '写行业指南': 'industry-guide',
  '写长篇报道': 'long-report',
  '定大纲': 'outline',
  '写章节': 'chapter',
  '导出': 'export',
  '去AI味': 'humanize',
  '质量自检': 'audit',
  '整理素材': 'material',
};

/**
 * 规范化用户意图
 * @param {string} intent - 原始意图
 * @returns {string} 规范化后的意图
 */
export function normalizeIntent(intent) {
  if (!intent) return 'auto';

  const trimmed = intent.trim().toLowerCase();

  // 直接匹配
  if (INTENT_ALIASES[trimmed]) {
    return INTENT_ALIASES[trimmed];
  }

  // 英文别名匹配
  const reverseMap = Object.fromEntries(
    Object.entries(INTENT_ALIASES).map(([k, v]) => [v, v])
  );
  if (reverseMap[trimmed]) {
    return reverseMap[trimmed];
  }

  // 默认返回原始值
  return trimmed;
}

// ── 阶段映射 ────────────────────────────────────────────────────────────────

/**
 * 阶段名称映射
 */
export const PHASE_MAP = {
  // 数字 → 文字
  '0': 'S0',
  '1': 'S1',
  '2': 'S2',
  '3': 'S3',
  '4': 'S4',
  '5': 'S5',
  '6': 'S6',
  // 文字变体
  's0': 'S0',
  's1': 'S1',
  'phase0': 'S0',
  'phase1': 'S1',
  // 中文
  '素材整理': 'S0',
  '大纲规划': 'S1',
  '正式写稿': 'S3',
  '扩写': 'S3.5',
  '质检': 'S4',
  '交付': 'S5',
  '归档': 'S6',
};

/**
 * 规范化阶段名称
 * @param {string} phase - 原始阶段
 * @returns {string} 规范化后的阶段
 */
export function normalizePhase(phase) {
  if (!phase) return 'unknown';
  return PHASE_MAP[phase] || phase.toUpperCase().replace('PHASE', 'S');
}

// ── CLI 入口 ────────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('context-mapper.mjs')) {
  const args = process.argv.slice(2);

  if (args[0] === 'intent') {
    // 意图规范化测试
    const intent = args[1];
    console.log(normalizeIntent(intent));
  } else if (args[0] === 'phase') {
    // 阶段规范化测试
    const phase = args[1];
    console.log(normalizePhase(phase));
  } else {
    console.log('用法:');
    console.log('  node context-mapper.mjs intent <意图>');
    console.log('  node context-mapper.mjs phase <阶段>');
  }
}
