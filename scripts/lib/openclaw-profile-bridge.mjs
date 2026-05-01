/**
 * openclaw-profile-bridge.mjs — OpenClaw 工作区 → FBS 画像适配
 * FBS-BookWriter v2.1.2
 *
 * 从 OpenClaw 标准工作区文件（USER.md / IDENTITY.md / SOUL.md）提取用户画像，
 * 输出与 workbuddy-user-profile-bridge.mjs 兼容的 profile 对象。
 *
 * 部署到任何服务器都有效（只要工作区有 USER.md / IDENTITY.md）。
 */

import fs from 'fs';
import path from 'path';

// ============================================================
// 简单 YAML 风格字段提取器
// ============================================================
function extractFields(content, pattern) {
  const result = {};
  if (!content) return result;
  for (const [key, fieldName] of Object.entries(pattern)) {
    const regex = new RegExp(`[-*]\\s*\\*\\*?${key}\\*\\*?\\s*:\\s*(.+?)(?:\\n|$)`, 'i');
    const match = content.match(regex);
    if (match) {
      let val = match[1].trim();
      // 去掉括号内的占位提示
      val = val.replace(/[（(][^)）]+[)）]/g, '').trim();
      // 去掉 markdown 加粗/倾斜
      val = val.replace(/\*+/g, '').trim();
      if (val && !val.startsWith('_')) result[fieldName] = val;
    }
  }
  return result;
}

/**
 * 从 OpenClaw 工作区目录提取用户画像
 * @param {string} workspaceDir — 如 ~/.openclaw/workspace
 * @returns {object|null} — 与 workbuddy-user-profile-bridge 兼容的 profile，或 null
 */
export function extractOpenClawProfile(workspaceDir) {
  if (!workspaceDir || !fs.existsSync(workspaceDir)) return null;

  const userPath = path.join(workspaceDir, 'USER.md');
  const identityPath = path.join(workspaceDir, 'IDENTITY.md');
  const soulPath = path.join(workspaceDir, 'SOUL.md');

  const basicInfo = { name: '', callName: '', city: '', pronouns: '' };
  const personality = { values: [] };

  // 从 USER.md 提取
  if (fs.existsSync(userPath)) {
    const content = fs.readFileSync(userPath, 'utf8');
    const fields = extractFields(content, {
      'Name': 'name',
      'What to call them': 'callName',
      'Pronouns': 'pronouns',
      'Timezone': 'timezone',
    });
    if (fields.name) basicInfo.name = fields.name;
    if (fields.callName) basicInfo.callName = fields.callName;
    else if (fields.name) basicInfo.callName = fields.name;
    if (fields.pronouns) basicInfo.pronouns = fields.pronouns;
  }

  // 从 IDENTITY.md 提取（如果 USER.md 没填）
  if (fs.existsSync(identityPath)) {
    const content = fs.readFileSync(identityPath, 'utf8');
    const fields = extractFields(content, {
      'Name': 'name',
      'Creature': 'creature',
      'Vibe': 'vibe',
      'Emoji': 'emoji',
    });
    if (!basicInfo.name && fields.name) basicInfo.name = fields.name;
    if (!basicInfo.callName && fields.name) basicInfo.callName = fields.name;
    if (fields.vibe) personality.values = [fields.vibe];
  }

  // 从 SOUL.md 提取核心信条（仅粗体标题部分）
  if (fs.existsSync(soulPath)) {
    const content = fs.readFileSync(soulPath, 'utf8');
    // 匹配 **核心信条** 或 **Be XXX.** 这样的粗体短语
    const valueMatches = content.match(/\*\*([^*]+?\*\*?|[A-Z][a-z]+[^.]+?\.?)\*\*/g);
    if (valueMatches) {
      // 取前导粗体短语的外层（去掉 **）
      personality.values = valueMatches
        .map(v => v.replace(/^\*\*|\*\*$/g, '').trim())
        .filter(v => v.length > 3 && v.length < 80)  // 过滤掉太长或太短的
        .slice(0, 3);
    }
    // 如果没有匹配到短短语，回退取第一段 bold 文字
    if (personality.values.length === 0) {
      const paraMatch = content.match(/^\*\*([^*]+?)\*\*/m);
      if (paraMatch) personality.values = [paraMatch[1].trim().slice(0, 60)];
    }
  }

  const hasName = basicInfo.name.length > 0;
  const hasCallName = basicInfo.callName.length > 0;

  return {
    basicInfo,
    workContext: {
      projectTypes: [],
      currentProject: '',
      expertise: [],
    },
    preferences: {
      mode: '',
      output: '',
      collaboration: '',
      confirmation: '',
    },
    history: {
      projectTypes: [],
      writingGenres: [],
      commonKeywords: [],
      recentProjects: [],
    },
    personality,
    boundaries: [],
    isProfileComplete: hasName && hasCallName,
    _source: 'openclaw-workspace',
  };
}
