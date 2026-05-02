/**
 * user-errors.mjs — FBS 用户可见错误格式化
 * FBS-BookWriter v2.1.2
 *
 * 用途：所有用户直接调用的脚本在入口处用 tryMain 包装，
 *      确保异常时输出统一、用户可读的中文错误信息。
 *
 * 用法：
 *   import { tryMain, friendlyError } from './lib/user-errors.mjs';
 *
 *   // 包装整个入口
 *   tryMain(async () => {
 *     const result = await doSomething();
 *     console.log(JSON.stringify(result));
 *   }, { friendlyName: '导出 PDF' });
 *
 *   // 或手动构造错误
 *   throw friendlyError('缺少依赖', '请安装 puppeteer：npm install');
 */

// ============================================================
// 错误分类映射（原因 → 中文描述模板）
// ============================================================
const ERROR_CATEGORIES = {
  // 依赖缺失
  MODULE_NOT_FOUND:    { title: '缺少依赖',     emoji: '📦' },
  ERR_MODULE_NOT_FOUND:{ title: '缺少依赖',     emoji: '📦' },
  ERR_REQUIRE_ESM:     { title: '模块加载错误', emoji: '📦' },

  // Node.js 文件系统
  ENOENT:              { title: '文件或目录不存在', emoji: '📁' },
  EACCES:              { title: '没有权限访问',     emoji: '🔒' },
  EEXIST:              { title: '文件已存在',       emoji: '📁' },
  ENOTDIR:             { title: '路径不是目录',     emoji: '📁' },
  ENOTEMPTY:           { title: '目录不为空',       emoji: '📁' },
  EISDIR:              { title: '路径是目录不是文件', emoji: '📁' },
  EROFS:               { title: '只读文件系统',     emoji: '🔒' },
  ENOSPC:              { title: '磁盘空间不足',     emoji: '💾' },

  // 网络
  ERR_NETWORK:         { title: '网络连接错误',     emoji: '🌐' },
  ECONNREFUSED:        { title: '连接被拒绝',       emoji: '🌐' },
  ECONNRESET:          { title: '连接被重置',       emoji: '🌐' },
  ETIMEDOUT:           { title: '连接超时',         emoji: '🌐' },
  ENOTFOUND:           { title: 'DNS 解析失败',     emoji: '🌐' },
  ERR_HTTP2_GOAWAY:    { title: '服务器连接中断',  emoji: '🌐' },

  // Puppeteer / PDF 导出
  ERR_LAUNCH_FAILED:   { title: '浏览器启动失败',  emoji: '🖨️' },
  ERR_TIMEOUT:         { title: '操作超时',         emoji: '⏱️' },

  // 参数校验
  ERR_INVALID_ARG_TYPE:{ title: '参数类型错误',     emoji: '⚙️' },
  ERR_MISSING_ARGS:    { title: '缺少必要参数',     emoji: '⚙️' },

  // Shell/子进程
  ERR_CHILD_PROCESS:   { title: '子进程执行失败',  emoji: '💻' },
};

// ============================================================
// 友好错误对象
// ============================================================
export class UserError extends Error {
  /**
   * @param {string} action       — 用户正在做的操作，如"导出 PDF"
   * @param {string} reason       — 失败原因摘要
   * @param {object} [opts]
   * @param {string} [opts.solution] — 建议解决方案
   * @param {string} [opts.code]      — 原始错误 code（用于匹配标题）
   */
  constructor(action, reason, opts = {}) {
    const cat = ERROR_CATEGORIES[opts.code] || {};
    const title = opts.code ? cat.title : '';
    const emoji = opts.code ? cat.emoji : '⚠️';

    const parts = [`${emoji} 调用${action}失败`];
    if (title) parts.push(`，${title}`);
    if (reason) parts.push(`：${reason}`);
    if (opts.solution) parts.push(`\n  💡 建议：${opts.solution}`);

    super(parts.join(''));
    this.name = 'UserError';
    this.action = action;
    this.reason = reason;
    this.code = opts.code;
    this.solution = opts.solution;
    this.userMessage = this.message;
  }
}

/**
 * 快速构造友好错误
 * @param {string} reason            — 原因（如"缺少依赖"）
 * @param {string} [solution]        — 可选解决方案
 * @param {object} [opts]
 * @param {string} [opts.action]     — 操作名
 * @param {string} [opts.code]       — 错误 code
 */
export function friendlyError(reason, solution, opts = {}) {
  return new UserError(opts.action || '功能', reason, {
    solution, code: opts.code,
  });
}

// ============================================================
// main() 包装器
// ============================================================
/**
 * 包装 async 入口函数，统一捕获异常并输出 JSON 或文本错误
 *
 * @param {() => Promise<any>} fn      — 入口函数
 * @param {object} [opts]
 * @param {string} [opts.friendlyName] — 操作中文名，如"初始化项目"
 * @param {boolean} [opts.jsonOutput]  — 是否输出 JSON（默认 auto：检测 --json 参数）
 */
export async function tryMain(fn, opts = {}) {
  const friendlyName = opts.friendlyName || 'FBS 功能';

  // 自动检测是否请求 JSON 输出
  let jsonOutput = opts.jsonOutput;
  if (jsonOutput === undefined) {
    jsonOutput = process.argv.includes('--json');
  }

  try {
    const result = await fn();
    if (result !== undefined && jsonOutput) {
      const out = typeof result === 'string' ? result : JSON.stringify(result);
      if (!process.argv.includes('--json-out')) {
        console.log(out);
      }
    }
  } catch (err) {
    // 构造用户可见消息
    let userMsg;
    let solution = null;

    if (err instanceof UserError) {
      userMsg = err.userMessage;
      solution = err.solution;
    } else {
      const code = err.code || '';
      const errName = err.name || '';
      const errMsg = err.message || '';
      const errCause = err.cause?.message || err.cause?.code || '';

      // 从 cause 中提取网络错误码（fetch API 的底层错误）
      const effectiveCode = code || errCause;

      // 检测网络相关关键词（从错误消息中识别 ECONNREFUSED/ETIMEDOUT 等）
      const isNetworkError =
        errName === 'AbortError' ||                           // fetch 超时中止
        errName === 'TypeError' && (
          errMsg.includes('fetch') ||
          errMsg.includes('network') ||
          errMsg.includes('连接') ||
          errMsg.includes('网络')
        ) ||
        String(err).includes('ECONNREFUSED') ||
        String(err).includes('ETIMEDOUT') ||
        String(err).includes('ENOTFOUND') ||
        String(err).includes('ECONNRESET');

      // 识别超时中止（AbortError）
      if (errName === 'AbortError' || errMsg.includes('aborted')) {
        const cat = ERROR_CATEGORIES['ETIMEDOUT'] || {};
        userMsg = `${cat.emoji || '🌐'} 调用${friendlyName}失败，${cat.title || '连接超时'}：请求被中止（可能是网络较慢或服务器无响应）`;
        solution = '请检查网络连接，或稍后重试。如果持续出现此问题，可能是目标服务器响应过慢。';
      }
      // 识别具体网络错误码
      else if (effectiveCode === 'ECONNREFUSED' || String(err).includes('ECONNREFUSED')) {
        const cat = ERROR_CATEGORIES['ECONNREFUSED'] || {};
        userMsg = `${cat.emoji || '🌐'} 调用${friendlyName}失败，${cat.title || '连接被拒绝'}：目标服务器拒绝连接`;
        solution = '请检查网络连接，或确认目标服务是否正常运行。';
      }
      else if (effectiveCode === 'ETIMEDOUT' || String(err).includes('ETIMEDOUT')) {
        const cat = ERROR_CATEGORIES['ETIMEDOUT'] || {};
        userMsg = `${cat.emoji || '🌐'} 调用${friendlyName}失败，${cat.title || '连接超时'}：网络连接超时`;
        solution = '网络较慢或不稳定，请稍后重试，或检查是否开启了代理。';
      }
      else if (effectiveCode === 'ENOTFOUND' || String(err).includes('ENOTFOUND') || errMsg.includes('getaddrinfo')) {
        const cat = ERROR_CATEGORIES['ENOTFOUND'] || {};
        userMsg = `${cat.emoji || '🌐'} 调用${friendlyName}失败，${cat.title || 'DNS 解析失败'}：无法解析目标地址`;
        solution = '请检查网址是否正确，或更换网络环境后重试。';
      }
      else if (effectiveCode === 'ECONNRESET' || String(err).includes('ECONNRESET')) {
        const cat = ERROR_CATEGORIES['ECONNRESET'] || {};
        userMsg = `${cat.emoji || '🌐'} 调用${friendlyName}失败，${cat.title || '连接被重置'}：服务器意外断开连接`;
        solution = '网络不稳定，请稍后重试。';
      }
      // 通用网络错误
      else if (isNetworkError) {
        const cat = ERROR_CATEGORIES['ERR_NETWORK'] || {};
        userMsg = `${cat.emoji || '🌐'} 调用${friendlyName}失败，${cat.title || '网络连接错误'}：${errMsg}`;
        solution = '请检查网络连接，或稍后重试。';
      }
      // 已知错误码
      else {
        const cat = ERROR_CATEGORIES[effectiveCode] || {};
        const title = cat.title || '未知错误';
        const emoji = cat.emoji || '⚠️';
        const reason = errMsg.split('\n')[0] || String(err);

        userMsg = `${emoji} 调用${friendlyName}失败，${title}：${reason}`;

        // 常见问题附建议
        if (effectiveCode === 'MODULE_NOT_FOUND' || effectiveCode === 'ERR_MODULE_NOT_FOUND') {
          solution = '请进入 skill 目录执行：npm install';
        } else if (effectiveCode === 'ENOENT') {
          const m = errMsg.match(/'([^']+)'/);
          solution = m ? `请检查路径是否存在：${m[1]}` : '请检查文件路径是否正确';
        } else if (effectiveCode === 'ERR_LAUNCH_FAILED') {
          solution = '请安装 Chromium 或检查系统依赖';
        }
      }

      // 追加建议（如果已有 userMsg 且还没有建议）
      if (solution && !userMsg.includes('💡')) {
        userMsg += `\n  💡 建议：${solution}`;
      }
    }

    if (jsonOutput) {
      const errObj = { ok: false, error: userMsg };
      if (process.argv.includes('--json-out')) {
        // 如果指定了 --json-out，写入文件而不是 stdout
        const idx = process.argv.indexOf('--json-out');
        if (idx > 0 && process.argv[idx + 1]) {
          const fs = await import('fs');
          const outPath = process.argv[idx + 1];
          fs.mkdirSync(require('path').dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, JSON.stringify(errObj, null, 2));
          return;
        }
      }
      console.error(JSON.stringify(errObj));
    } else {
      console.error(`\n${userMsg}\n`);
    }

    process.exit(1);
  }
}

/**
 * 解析 --book-root 参数的快捷函数（带友好错误）
 */
export function getBookRoot() {
  const idx = process.argv.indexOf('--book-root');
  if (idx === -1 || !process.argv[idx + 1]) {
    throw new UserError('脚本执行', '缺少必要参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请传入 --book-root <书稿根目录>',
    });
  }
  return process.argv[idx + 1];
}

// ============================================================
// 增强：错误重试装饰器
// ============================================================

/**
 * 可重试的错误类
 * 标记错误为可重试类型
 */
export class RetryableError extends UserError {
  constructor(action, reason, opts = {}) {
    super(action, reason, { ...opts, retryable: true });
    this.name = 'RetryableError';
    this.retryable = true;
  }
}

/**
 * 判断错误是否可重试
 * @param {Error} err - 错误对象
 * @returns {boolean}
 */
export function isRetryable(err) {
  // 用户错误不可重试
  if (err instanceof UserError && !err.retryable) {
    return false;
  }
  // 明确标记为可重试的错误
  if (err.retryable === true) {
    return true;
  }
  // 网络相关错误通常可重试
  const retryableCodes = [
    'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
    'ERR_NETWORK', 'ERR_HTTP2_GOAWAY', 'ENOTFOUND',
  ];
  const code = err.code || '';
  return retryableCodes.includes(code) || code.includes('TIMEOUT');
}

/**
 * 睡眠函数
 * @param {number} ms - 毫秒数
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带重试的异步函数包装
 *
 * @param {Function} fn - 要执行的异步函数
 * @param {object} opts
 * @param {number} [opts.maxRetries=3] - 最大重试次数
 * @param {number} [opts.baseDelay=1000] - 基础延迟（毫秒），使用指数退避
 * @param {Function} [opts.shouldRetry] - 判断是否应该重试的函数，默认使用 isRetryable
 * @param {Function} [opts.onRetry] - 重试时的回调函数 (attempt, error) => void
 *
 * @example
 * const result = await withRetry(async () => {
 *   return await fetchData();
 * }, {
 *   maxRetries: 3,
 *   baseDelay: 1000,
 *   onRetry: (attempt, err) => console.log(`重试 ${attempt}...`)
 * });
 */
export async function withRetry(fn, opts = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    shouldRetry = isRetryable,
    onRetry = null,
  } = opts;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;

      // 检查是否应该重试
      const canRetry = attempt <= maxRetries && shouldRetry(err);

      if (canRetry) {
        const delay = baseDelay * Math.pow(2, attempt - 1);  // 指数退避: 1s, 2s, 4s...

        // 显示重试提示
        if (onRetry) {
          onRetry(attempt, err);
        } else {
          const retryableInfo = isRetryable(err) ? '（可重试）' : '（强制重试）';
          console.log(`\n⏳ 第 ${attempt}/${maxRetries} 次尝试失败${retryableInfo}`);
          console.log(`   错误: ${err.message || err}`);
          console.log(`   ${delay / 1000} 秒后重试...\n`);
        }

        await sleep(delay);
      } else {
        // 不再重试，抛出错误
        break;
      }
    }
  }

  // 所有重试都失败后，抛出友好错误
  throw lastError;
}

/**
 * 带进度追踪的重试包装器
 * 结合 withProgress 和 withRetry 的功能
 *
 * @param {Function} fn - 要执行的异步函数 (tracker) => Promise
 * @param {object} config - 配置
 * @param {string} config.name - 任务名称
 * @param {string} [config.type] - 操作类型
 * @param {Function} [config.estimate] - 时间估算函数
 * @param {object} retryOpts - 重试选项
 */
export async function withProgressAndRetry(fn, config, retryOpts = {}) {
  const { createProgressTracker, estimateTime, formatTime } = await import('./ux-progress-enhanced.mjs');

  const tracker = createProgressTracker(config);
  const { shouldContinue } = await tracker.start(config.args || {});

  if (!shouldContinue) {
    return { cancelled: true };
  }

  try {
    const result = await withRetry(
      async (attempt) => {
        tracker.update({
          progress: attempt > 1 ? 50 + (attempt - 1) * 10 : 50,
          message: attempt > 1 ? `重试第 ${attempt} 次...` : '执行中...'
        });
        return await fn(tracker);
      },
      {
        ...retryOpts,
        onRetry: (attempt, err) => {
          tracker.update({
            progress: 40,
            message: `重试中 (${attempt}/${retryOpts.maxRetries || 3})`
          });
        },
      }
    );

    tracker.complete();
    return { success: true, result };
  } catch (error) {
    tracker.fail(error);
    return { success: false, error };
  }
}

// ============================================================
// 增强：详细错误类
// ============================================================

/**
 * 详细错误类
 * 包含错误位置、堆栈等调试信息，用于开发者调试
 * 但在显示给用户时会被转换为友好格式
 */
export class DetailedError extends UserError {
  /**
   * @param {string} action - 操作名称
   * @param {string} reason - 失败原因
   * @param {object} context - 错误上下文
   * @param {string} [context.code] - 错误代码
   * @param {string} [context.solution] - 建议解决方案
   * @param {string} [context.stack] - 堆栈信息
   * @param {string} [context.file] - 文件位置
   * @param {number} [context.line] - 行号
   * @param {object} [context.details] - 其他详细信息
   */
  constructor(action, reason, context = {}) {
    const { code, solution, stack, file, line, details, ...rest } = context;

    super(action, reason, { code, solution });

    this.name = 'DetailedError';
    this.stackTrace = stack || new Error().stack;
    this.fileLocation = file;
    this.lineNumber = line;
    this.details = details || rest;

    // 构造用户友好的简化消息
    this.simplifiedMessage = this._buildSimplifiedMessage();
  }

  _buildSimplifiedMessage() {
    const parts = [];

    // 基本错误信息
    if (this.action && this.reason) {
      parts.push(`${this.emoji || '⚠️'} 操作「${this.action}」失败`);
    }

    // 错误原因
    if (this.reason) {
      parts.push(`原因：${this.reason}`);
    }

    // 建议解决方案
    if (this.solution) {
      parts.push(`💡 建议：${this.solution}`);
    }

    return parts.join('\n');
  }

  /**
   * 获取用户可见的错误消息（简化版）
   */
  getUserMessage() {
    return this.simplifiedMessage;
  }

  /**
   * 获取开发者可见的错误消息（详细版）
   */
  getDeveloperMessage() {
    const parts = [this.message];

    if (this.fileLocation) {
      parts.push(`文件: ${this.fileLocation}`);
    }
    if (this.lineNumber) {
      parts.push(`行号: ${this.lineNumber}`);
    }
    if (this.stackTrace) {
      parts.push(`\n堆栈:\n${this.stackTrace}`);
    }

    return parts.join('\n');
  }
}

// ============================================================
// 错误场景分类及解决方案
// ============================================================

export const ERROR_SCENARIOS = {
  // 网络错误
  NETWORK_CONNECTION_REFUSED: {
    codes: ['ECONNREFUSED', 'ECONNREFUSED'],
    title: '网络连接被拒绝',
    solution: '请检查网络连接，或稍后重试。如果问题持续，请联系管理员。',
    retryable: true,
    emoji: '🌐',
  },
  NETWORK_CONNECTION_RESET: {
    codes: ['ECONNRESET', 'ECONNRESET'],
    title: '网络连接被重置',
    solution: '网络不稳定，请检查网络连接后重试。',
    retryable: true,
    emoji: '🌐',
  },
  NETWORK_TIMEOUT: {
    codes: ['ETIMEDOUT', 'ETIMEDOUT'],
    title: '网络连接超时',
    solution: '网络较慢，请稍后重试，或检查是否开启了代理。',
    retryable: true,
    emoji: '🌐',
  },
  DNS_LOOKUP_FAILED: {
    codes: ['ENOTFOUND', 'ENOTFOUND', 'ERR_NAME_NOT_RESOLVED'],
    title: 'DNS 解析失败',
    solution: '请检查网址是否正确，或更换网络环境后重试。',
    retryable: true,
    emoji: '🌐',
  },

  // 文件系统错误
  FILE_NOT_FOUND: {
    codes: ['ENOENT', 'ENOENT'],
    title: '文件或目录不存在',
    solution: '请检查文件路径是否正确，确保文件或目录已创建。',
    retryable: false,
    emoji: '📁',
  },
  PERMISSION_DENIED: {
    codes: ['EACCES', 'EACCES', 'EPERM'],
    title: '没有权限访问',
    solution: '请检查文件权限，或以管理员身份运行。',
    retryable: false,
    emoji: '🔒',
  },
  DISK_FULL: {
    codes: ['ENOSPC', 'ENOSPC'],
    title: '磁盘空间不足',
    solution: '请清理磁盘空间，或更换存储位置。',
    retryable: false,
    emoji: '💾',
  },
  FILE_ALREADY_EXISTS: {
    codes: ['EEXIST', 'EEXIST'],
    title: '文件已存在',
    solution: '请删除或重命名现有文件后再试。',
    retryable: false,
    emoji: '📁',
  },

  // 依赖错误
  MODULE_NOT_FOUND: {
    codes: ['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'],
    title: '缺少依赖模块',
    solution: '请进入 skill 目录执行：npm install',
    retryable: false,
    emoji: '📦',
  },
  BROWSER_LAUNCH_FAILED: {
    codes: ['ERR_LAUNCH_FAILED', 'ERR_LAUNCH_FAILED'],
    title: '浏览器启动失败',
    solution: '请安装 Chromium 或检查系统依赖。在 Linux 上可运行：apt install chromium',
    retryable: true,
    emoji: '🖨️',
  },

  // 参数错误
  INVALID_ARGUMENT: {
    codes: ['ERR_INVALID_ARG_TYPE', 'ERR_INVALID_ARG_TYPE'],
    title: '参数类型错误',
    solution: '请检查输入参数的类型是否正确。',
    retryable: false,
    emoji: '⚙️',
  },
  MISSING_ARGUMENT: {
    codes: ['ERR_MISSING_ARGS', 'ERR_ARG_TYPE_MISMATCH'],
    title: '缺少必要参数',
    solution: '请提供所有必需的参数。',
    retryable: false,
    emoji: '⚙️',
  },
};

/**
 * 根据错误代码获取场景信息
 * @param {string} code - 错误代码
 * @returns {object|null} 场景信息
 */
export function getErrorScenario(code) {
  for (const scenario of Object.values(ERROR_SCENARIOS)) {
    if (scenario.codes.includes(code)) {
      return scenario;
    }
  }
  return null;
}

/**
 * 根据错误创建友好错误
 * @param {string} action - 操作名称
 * @param {Error} error - 原始错误
 * @returns {UserError} 友好的用户错误
 */
export function wrapError(action, error) {
  const err = error;
  const code = err.code || '';
  const errName = err.name || '';
  const errMsg = err.message || '';
  const errCause = err.cause?.code || '';
  const effectiveCode = code || errCause;
  const errStr = String(err);

  // 检测网络错误关键词
  const isNetworkRelated =
    errName === 'AbortError' ||
    errName === 'TypeError' && (errMsg.includes('fetch') || errMsg.includes('Failed to fetch') || errMsg.includes('network')) ||
    errStr.includes('ECONNREFUSED') ||
    errStr.includes('ETIMEDOUT') ||
    errStr.includes('ENOTFOUND') ||
    errStr.includes('ECONNRESET') ||
    errStr.includes('net::ERR');

  // 识别 AbortError（fetch 超时）
  if (errName === 'AbortError' || errMsg.toLowerCase().includes('aborted')) {
    return new UserError(action, '请求超时（网络较慢或服务器无响应）', {
      code: 'ETIMEDOUT',
      solution: '请检查网络连接，或稍后重试。如果持续出现此问题，可能是目标服务器响应过慢。',
    });
  }

  // 识别具体网络错误码
  const networkCode = errStr.includes('ECONNREFUSED') ? 'ECONNREFUSED'
    : errStr.includes('ETIMEDOUT') ? 'ETIMEDOUT'
    : errStr.includes('ENOTFOUND') || errMsg.includes('getaddrinfo') ? 'ENOTFOUND'
    : errStr.includes('ECONNRESET') ? 'ECONNRESET'
    : effectiveCode;

  if (networkCode && ERROR_CATEGORIES[networkCode]) {
    const cat = ERROR_CATEGORIES[networkCode];
    return new UserError(action, errMsg || cat.title, {
      code: networkCode,
      solution: cat.title === '连接被拒绝' ? '请检查网络连接，或确认目标服务是否正常运行。'
        : cat.title === '连接超时' ? '网络较慢或不稳定，请稍后重试，或检查是否开启了代理。'
        : cat.title === 'DNS 解析失败' ? '请检查网址是否正确，或更换网络环境后重试。'
        : cat.title === '连接被重置' ? '网络不稳定，请稍后重试。'
        : '请检查网络连接，或稍后重试。',
    });
  }

  // 通用网络错误
  if (isNetworkRelated) {
    const cat = ERROR_CATEGORIES['ERR_NETWORK'];
    return new UserError(action, errMsg || '网络连接错误', {
      code: 'ERR_NETWORK',
      solution: '请检查网络连接，或稍后重试。',
    });
  }

  // 尝试从 ERROR_CATEGORIES 获取
  const cat = ERROR_CATEGORIES[effectiveCode] || {};
  return new UserError(action, errMsg, {
    code: effectiveCode,
    solution: effectiveCode === 'MODULE_NOT_FOUND' ? '请进入 skill 目录执行：npm install'
      : effectiveCode === 'ENOENT' ? '请检查文件路径是否正确'
      : effectiveCode === 'ERR_LAUNCH_FAILED' ? '请安装 Chromium 或检查系统依赖'
      : cat.title ? '遇到问题，请检查输入后重试。'
      : '未知错误，请稍后重试。',
  });
}

