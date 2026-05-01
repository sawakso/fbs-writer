#!/usr/bin/env node
/**
 * OpenClaw 宿主能力桥接层
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 *
 * 功能:
 * - 自动检测 OpenClaw 宿主环境
 * - 读取用户配置和偏好
 * - 提供会话记忆抽象（基于 .fbs/ 文件）
 * - 提供预览/导出能力
 * - 兼容降级：OpenClaw 不支持的特性优雅降级
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── 路径常量 ────────────────────────────────────────────────────────────────

/** 尝试检测 OpenClaw 根目录 */
export function resolveOpenClawHome(env = process.env) {
  // 1. 环境变量优先
  if (env.OPENCLAW_HOME) return path.resolve(env.OPENCLAW_HOME);

  // 2. Windows 常见路径
  const userProfile = env.USERPROFILE || env.HOME || '';
  if (userProfile) {
    const candidates = [
      path.join(userProfile, 'openclaw'),
      path.join(userProfile, '.openclaw'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return candidate;
      }
    }
  }

  // 3. D:\openclaw 常见开发路径
  if (fs.existsSync('D:\\openclaw')) return 'D:\\openclaw';

  // 4. 回退到当前目录
  return process.cwd();
}

/** 解析 OpenClaw 相关路径 */
export function resolveOpenClawPaths(env = process.env) {
  const homeDir = resolveOpenClawHome(env);

  return {
    homeDir,
    configPath: path.join(homeDir, 'openclaw.json'),
    identityDir: path.join(homeDir, 'identity'),
    agentsDir: path.join(homeDir, 'agents'),
    skillsDir: path.join(homeDir, '.openclaw', 'skills'),
    workspaceSkillsDir: path.join(homeDir, '.openclaw', 'workspace', 'skills'),
    memoryDir: path.join(homeDir, '.openclaw', 'memory'),
    // 宿主用户画像目录（用于 FBS 存储用户偏好）
    userProfileDir: path.join(homeDir, '.openclaw', 'fbs-user-profile'),
  };
}

// ── 工具函数 ────────────────────────────────────────────────────────────────

function pathExists(targetPath) {
  return !!targetPath && fs.existsSync(targetPath);
}

function safeReadJson(filePath, fallback = null) {
  if (!pathExists(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function detectGit(cwd) {
  try {
    const result = spawnSync('git', ['--version'], { cwd, encoding: 'utf8', timeout: 3000 });
    if (result.status === 0) {
      const version = (result.stdout || '').trim().split(' ').pop();
      return { available: true, version };
    }
  } catch {
    // ignore
  }
  return { available: false };
}

function checkNodeEnv(minVersion = '18.0.0') {
  const version = process.version.slice(1);
  const [minMajor, minMinor] = minVersion.split('.').map(Number);
  const [maj, min] = version.split('.').map(Number);
  if (maj > minMajor || (maj === minMajor && min >= minMinor)) {
    return { ok: true, version, execPath: process.execPath };
  }
  return { ok: false, version, execPath: process.execPath, error: `Node.js ${minVersion}+ required, found ${version}` };
}

// ── 宿主类型检测 ─────────────────────────────────────────────────────────────

/**
 * 检测当前宿主类型
 * @returns {'openclaw' | 'workbuddy' | 'node-cli'}
 */
export function detectHostType() {
  const openclawPaths = resolveOpenClawPaths();

  // 检测 OpenClaw 特征文件
  const openclawMarkers = [
    openclawPaths.configPath,           // openclaw.json
    openclawPaths.agentsDir,            // agents/ 目录
  ];

  const openclawScore = openclawMarkers.filter(pathExists).length;

  if (openclawScore >= 1) {
    return 'openclaw';
  }

  // 检测 WorkBuddy
  const userProfile = process.env.USERPROFILE || process.env.HOME || '';
  const workbuddyMarkers = [
    path.join(userProfile, '.workbuddy', 'settings.json'),
    path.join(userProfile, '.workbuddy', 'USER.md'),
  ];

  const workbuddyScore = workbuddyMarkers.filter(fs.existsSync).length;
  if (workbuddyScore >= 1) {
    return 'workbuddy';
  }

  return 'node-cli';
}

// ── 用户画像 ────────────────────────────────────────────────────────────────

/**
 * 从 OpenClaw 配置中提取用户画像
 */
export function extractOpenClawUserProfile(openclawPaths) {
  const profile = {
    basicInfo: {
      name: '',
      callName: '',
      city: '',
      pronouns: '',
    },
    workContext: {
      projectTypes: [],
      currentProject: '',
      expertise: [],
    },
    preferences: {
      mode: 'interactive', // OpenClaw 默认交互式
      output: 'show_first',
      collaboration: 'single_agent',
      confirmation: 'per_chapter',
    },
    history: {
      projectTypes: [],
      writingGenres: [],
      commonKeywords: [],
      recentProjects: [],
    },
    isProfileComplete: false,
  };

  // 读取 openclaw.json 获取基本配置
  const config = safeReadJson(openclawPaths.configPath, {});

  // 从 agents 配置提取用户信息
  const agentsConfig = safeReadJson(
    path.join(openclawPaths.homeDir, 'agents', 'main', 'agent', 'models.json'),
    null
  );

  // 尝试从 skill 用户画像目录读取（如果存在）
  const userProfileDir = openclawPaths.userProfileDir;
  if (pathExists(userProfileDir)) {
    const userMd = path.join(userProfileDir, 'USER.md');
    const identityMd = path.join(userProfileDir, 'IDENTITY.md');
    const soulMd = path.join(userProfileDir, 'SOUL.md');

    if (pathExists(userMd)) {
      parseUserMD(fs.readFileSync(userMd, 'utf8'), profile);
    }
    if (pathExists(identityMd)) {
      parseIdentityMD(fs.readFileSync(identityMd, 'utf8'), profile);
    }
    if (pathExists(soulMd)) {
      parseSoulMD(fs.readFileSync(soulMd, 'utf8'), profile);
    }
  }

  // 判断画像完整性
  profile.isProfileComplete = checkProfileCompleteness(profile);

  return profile;
}

/**
 * 解析 USER.md 格式
 */
function parseUserMD(content, profile) {
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('- **Name:**')) {
      profile.basicInfo.name = extractValue(line);
    } else if (line.startsWith('- **What to call them:**')) {
      profile.basicInfo.callName = extractValue(line);
    } else if (line.startsWith('- **Pronouns:**')) {
      profile.basicInfo.pronouns = extractValue(line);
    } else if (line.startsWith('- **City:**')) {
      profile.basicInfo.city = extractValue(line);
    } else if (line.includes('Context') || line.includes('上下文')) {
      const contextMatch = content.match(/Context\s*[:：]\s*([\s\S]*?)(?=\n\n|\n#{1,3})/i);
      if (contextMatch) {
        profile.workContext.currentProject = contextMatch[1].trim().substring(0, 200);
      }
    }
  }
}

/**
 * 解析 IDENTITY.md 格式
 */
function parseIdentityMD(content, profile) {
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('- **Name:**')) {
      if (!profile.basicInfo.name) {
        profile.basicInfo.name = extractValue(line);
      }
    } else if (line.startsWith('- **Vibe:**')) {
      profile.personality = profile.personality || {};
      profile.personality.vibe = extractValue(line);
    }
  }
}

/**
 * 解析 SOUL.md 格式
 */
function parseSoulMD(content, profile) {
  profile.personality = profile.personality || {};

  // 提取价值观
  const valuesMatch = content.match(/Core Truths[：:]([\s\S]*?)(?=\n#{1,3}|\n---)/i);
  if (valuesMatch) {
    const valuesSection = valuesMatch[1];
    const bullets = valuesSection.match(/^\s*[-*]\s*.*$/gm) || [];
    profile.personality.values = bullets.map(b => b.replace(/^\s*[-*]\s*/, '').trim());
  }

  // 提取边界
  const boundariesMatch = content.match(/Boundaries[：:]([\s\S]*?)(?=\n#{1,3}|\n---)/i);
  if (boundariesMatch) {
    const boundariesSection = boundariesMatch[1];
    const bullets = boundariesSection.match(/^\s*[-*]\s*.*$/gm) || [];
    profile.personality.boundaries = bullets.map(b => b.replace(/^\s*[-*]\s*/, '').trim());
  }
}

function extractValue(line) {
  const match = line.match(/[:：]\s*(.+?)(?:\s*$)/);
  return match ? match[1].trim() : '';
}

function checkProfileCompleteness(profile) {
  const requiredFields = [
    profile.basicInfo.name || profile.basicInfo.callName,
    profile.workContext.currentProject,
  ];
  return requiredFields.some(f => f && f.length > 0);
}

// ── 会话记忆 ────────────────────────────────────────────────────────────────

/**
 * 读取会话记忆（基于 .fbs/ 文件）
 * OpenClaw 不提供宿主记忆 API，使用文件替代
 */
export function getSessionMemory(bookRoot) {
  const fbsDir = path.join(bookRoot, '.fbs');
  const resumePath = path.join(fbsDir, 'session-resume.json');
  const smartMemoryDir = path.join(fbsDir, 'smart-memory');

  const memory = {
    resumeExists: false,
    resume: null,
    smartMemoryFiles: [],
  };

  if (pathExists(resumePath)) {
    memory.resumeExists = true;
    memory.resume = safeReadJson(resumePath, null);
  }

  if (pathExists(smartMemoryDir)) {
    try {
      const files = fs.readdirSync(smartMemoryDir)
        .filter(f => f.endsWith('.md') || f.endsWith('.json'))
        .slice(0, 10); // 最多读取 10 个文件
      memory.smartMemoryFiles = files;
    } catch {
      // ignore
    }
  }

  return memory;
}

/**
 * 保存会话记忆到文件
 */
export function saveSessionMemory(bookRoot, data) {
  const fbsDir = path.join(bookRoot, '.fbs');

  // 确保目录存在
  if (!pathExists(fbsDir)) {
    fs.mkdirSync(fbsDir, { recursive: true });
  }

  const resumePath = path.join(fbsDir, 'session-resume.json');
  const smartMemoryDir = path.join(fbsDir, 'smart-memory');

  // 写入恢复卡
  if (data.resume) {
    fs.writeFileSync(resumePath, JSON.stringify(data.resume, null, 2), 'utf8');
  }

  // 写入智能记忆
  if (!pathExists(smartMemoryDir)) {
    fs.mkdirSync(smartMemoryDir, { recursive: true });
  }

  if (data.smartMemory) {
    const briefPath = path.join(smartMemoryDir, 'session-resume-brief.md');
    fs.writeFileSync(briefPath, data.smartMemory, 'utf8');
  }

  return { resumePath, smartMemoryDir };
}

// ── 预览/导出能力 ───────────────────────────────────────────────────────────

/**
 * 检测可用的导出能力
 */
export function getExportCapabilities() {
  const capabilities = {
    markdown: { supported: true, method: 'native' },
    html: { supported: true, method: 'native' },
    pdf: { supported: false, method: null, reason: '需要 puppeteer 或 html-pdf' },
    docx: { supported: false, method: null, reason: '需要 docx 库' },
    pptx: { supported: false, method: null, reason: 'OpenClaw 不支持 PPT 导出' },
  };

  // 检测可选依赖
  try {
    require.resolve('puppeteer');
    capabilities.pdf = { supported: true, method: 'puppeteer' };
  } catch {
    // puppeteer 未安装
  }

  try {
    require.resolve('docx');
    capabilities.docx = { supported: true, method: 'docx' };
  } catch {
    try {
      require.resolve('html-to-docx');
      capabilities.docx = { supported: true, method: 'html-to-docx' };
    } catch {
      // html-to-docx 也未安装
    }
  }

  return capabilities;
}

/**
 * 渲染 Markdown 预览（生成 HTML）
 */
export async function renderMarkdownPreview(markdownContent, options = {}) {
  const markdownIt = await loadMarkdownIt();

  const html = markdownIt.render(markdownContent);
  return wrapHtmlPreview(html, options);
}

/**
 * 加载 markdown-it（带扩展）
 */
async function loadMarkdownIt() {
  try {
    const MarkdownIt = (await import('markdown-it')).default;
    const markdownIt = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });

    // 加载脚注扩展
    try {
      const footnote = (await import('markdown-it-footnote')).default;
      markdownIt.use(footnote);
    } catch {
      // 脚注扩展可选
    }

    return markdownIt;
  } catch {
    // markdown-it 未安装，返回简单转换
    return {
      render: (md) => `<pre>${escapeHtml(md)}</pre>`
    };
  }
}

function wrapHtmlPreview(html, options = {}) {
  const title = options.title || 'FBS-BookWriter 预览';
  const css = getPreviewCss();

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>
  <article class="fbs-preview">
    ${html}
  </article>
</body>
</html>`;
}

function getPreviewCss() {
  return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif;
      line-height: 1.8;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1, h2, h3, h4 { margin-top: 1.5em; margin-bottom: 0.5em; }
    code { background: #f5f5f5; padding: 0.2em 0.4em; border-radius: 3px; }
    pre { background: #f5f5f5; padding: 1em; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding-left: 1em; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 0.5em; text-align: left; }
  `.replace(/\s+/g, ' ');
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ── 主机能力快照 ─────────────────────────────────────────────────────────────

/**
 * 创建 OpenClaw 宿主能力快照
 */
export function createOpenClawHostSnapshot({ bookRoot, skillRoot } = {}) {
  const resolvedBookRoot = path.resolve(bookRoot || process.cwd());
  const resolvedSkillRoot = path.resolve(skillRoot || __dirname);
  const openclawPaths = resolveOpenClawPaths();
  const nodeEnv = checkNodeEnv('18.0.0');
  const git = detectGit(resolvedBookRoot);
  const hostType = detectHostType();

  const markers = {
    openclawHomeExists: pathExists(openclawPaths.homeDir),
    configExists: pathExists(openclawPaths.configPath),
    identityExists: pathExists(openclawPaths.identityDir),
    agentsExists: pathExists(openclawPaths.agentsDir),
    skillsDirExists: pathExists(openclawPaths.skillsDir),
    workspaceSkillsExists: pathExists(openclawPaths.workspaceSkillsDir),
    userProfileDirExists: pathExists(openclawPaths.userProfileDir),
  };

  const config = safeReadJson(openclawPaths.configPath, {});
  const exportCapabilities = getExportCapabilities();

  return {
    $schema: 'fbs-openclaw-host-capability-v1',
    detectedAt: new Date().toISOString(),
    cacheTtlMinutes: 60,
    channel: 'openclaw',
    hostType,
    bookRoot: resolvedBookRoot,
    skillRoot: resolvedSkillRoot,
    nodeEnv: {
      ok: nodeEnv.ok,
      version: nodeEnv.version,
      execPath: nodeEnv.execPath,
      minRequired: '18.0.0',
      ...(nodeEnv.error ? { warning: nodeEnv.error } : {}),
    },
    git,
    openclaw: {
      homeDir: openclawPaths.homeDir,
      configPath: openclawPaths.configPath,
      identityDir: openclawPaths.identityDir,
      agentsDir: openclawPaths.agentsDir,
      skillsDir: openclawPaths.skillsDir,
      workspaceSkillsDir: openclawPaths.workspaceSkillsDir,
      userProfileDir: openclawPaths.userProfileDir,
      modelProvider: config.models?.providers ? Object.keys(config.models.providers)[0] : null,
    },
    markers,
    exportCapabilities,
    routingMode: nodeEnv.ok ? 'script-only' : 'dialog-only',
    recommendedEntry: 'file-based-resume',
    recommendedActions: buildRecommendedActions(hostType, markers, exportCapabilities),
  };
}

function buildRecommendedActions(hostType, markers, exportCapabilities) {
  const actions = [];

  if (hostType === 'openclaw') {
    actions.push('OpenClaw 宿主检测成功，使用文件化会话恢复');

    if (markers.userProfileDirExists) {
      actions.push('检测到用户画像目录，可用于个性化写作风格');
    }

    if (exportCapabilities.pdf.supported) {
      actions.push('PDF 导出可用（puppeteer）');
    } else {
      actions.push('PDF 导出不可用，安装 puppeteer 以支持');
    }

    if (exportCapabilities.docx.supported) {
      actions.push('DOCX 导出可用');
    } else {
      actions.push('DOCX 导出不可用，安装 docx 或 html-to-docx 以支持');
    }
  } else {
    actions.push('未检测到 OpenClaw 宿主，降级为纯脚本模式');
  }

  return actions;
}

// ── CLI 入口 ────────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('openclaw-host-bridge.mjs')) {
  const args = process.argv.slice(2);

  if (args.includes('--detect')) {
    // 检测宿主类型
    const hostType = detectHostType();
    console.log(`宿主类型: ${hostType}`);
  } else if (args.includes('--snapshot')) {
    // 生成宿主快照
    const snapshot = createOpenClawHostSnapshot();
    console.log(JSON.stringify(snapshot, null, 2));
  } else if (args.includes('--profile')) {
    // 输出用户画像
    const paths = resolveOpenClawPaths();
    const profile = extractOpenClawUserProfile(paths);
    console.log(JSON.stringify(profile, null, 2));
  } else if (args.includes('--export-caps')) {
    // 输出导出能力
    const caps = getExportCapabilities();
    console.log(JSON.stringify(caps, null, 2));
  } else {
    // 默认：输出完整信息
    const paths = resolveOpenClawPaths();
    console.log('\n📍 OpenClaw 宿主信息');
    console.log('─'.repeat(40));
    console.log(`根目录: ${paths.homeDir}`);
    console.log(`配置: ${paths.configPath}`);
    console.log(`宿主类型: ${detectHostType()}`);
    console.log('');
    console.log('🖥️  导出能力');
    console.log('─'.repeat(40));
    const caps = getExportCapabilities();
    for (const [format, cap] of Object.entries(caps)) {
      const status = cap.supported ? '✅' : '❌';
      console.log(`${status} ${format}: ${cap.reason || cap.method}`);
    }
  }
}
