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

    if (err instanceof UserError) {
      userMsg = err.userMessage;
    } else {
      const code = err.code || '';
      const cat = ERROR_CATEGORIES[code] || {};
      const title = cat.title || '未知错误';
      const emoji = cat.emoji || '⚠️';
      const reason = err.message?.split('\n')[0] || String(err);

      userMsg = `${emoji} 调用${friendlyName}失败，${title}：${reason}`;

      // 常见问题附建议
      if (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') {
        userMsg += '\n  💡 请进入 skill 目录执行：npm install';
      } else if (code === 'ENOENT') {
        const m = err.message?.match(/'([^']+)'/);
        if (m) userMsg += `\n  💡 请检查路径是否存在：${m[1]}`;
      } else if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
        userMsg += '\n  💡 请检查网络连接或代理设置';
      } else if (code === 'ERR_LAUNCH_FAILED') {
        userMsg += '\n  💡 请安装 Chromium 或检查系统依赖';
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
