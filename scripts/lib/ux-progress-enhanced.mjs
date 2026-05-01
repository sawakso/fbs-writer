/**
 * ux-progress-enhanced.mjs — FBS 增强版进度报告器
 * FBS-BookWriter v2.1.2
 *
 * 功能：
 * 1. 时间估算（算法估算）
 * 2. ASCII 进度条显示
 * 3. 长任务确认流程（估算时间 → 询问用户 → 执行）
 * 4. 实时进度更新
 *
 * 用法：
 *   import { createProgressTracker } from './lib/ux-progress-enhanced.mjs';
 *
 *   const tracker = createProgressTracker({
 *     name: '章节合并',
 *     type: 'merge-chapters',
 *     estimate: (args) => ({ chapterCount: 5 }),
 *   });
 *
 *   await tracker.start(args);  // 返回是否继续
 *   tracker.update({ progress: 30, message: '扫描文件...' });
 *   tracker.complete('合并完成');
 */

// ============================================================
// 常量配置
// ============================================================
const LONG_TASK_THRESHOLD_MINUTES = 2; // 超过2分钟需要确认
const PROGRESS_BAR_WIDTH = 40;         // 进度条宽度（字符数）

// ============================================================
// 时间估算算法
// ============================================================

/**
 * 根据操作类型和参数估算时间（分钟）
 * @param {string} type - 操作类型
 * @param {object} params - 操作参数
 * @returns {number} 估算时间（分钟）
 */
export function estimateTime(type, params = {}) {
  const estimators = {
    // 章节合并：每章 0.5 分钟
    'merge-chapters': (p) => (p.chapterCount || 1) * 0.5,

    // PDF 导出：固定 2 分钟（包含渲染时间）
    'export-pdf': () => 2,

    // DOCX 导出：固定 1.5 分钟
    'export-docx': () => 1.5,

    // 质量审计：每千字 0.5 分钟
    'quality-audit': (p) => (p.wordCount || 1000) / 1000 * 0.5,

    // 章节写作：每千字 2 分钟（AI 生成）
    'write-chapter': (p) => (p.wordCount || 5000) / 1000 * 2,

    // 全书写作：根据章节数和字数
    'write-book': (p) => {
      const chapterTime = (p.chapterCount || 10) * 5;  // 每章 5 分钟
      const wordTime = (p.totalWordCount || 50000) / 1000 * 1.5;  // 每千字 1.5 分钟
      return chapterTime + wordTime;
    },

    // 素材搜集：每源 1 分钟
    'research': (p) => (p.sourceCount || 5) * 1,

    // 大纲生成：固定 3 分钟
    'outline': () => 3,

    // 导入模板：固定 1 分钟
    'apply-template': () => 1,
  };

  const estimator = estimators[type];
  if (estimator) {
    return Math.max(0.1, estimator(params));
  }

  // 默认估算：基于 progressSteps 数量
  if (params.progressSteps) {
    return params.progressSteps * 0.5;
  }

  return 1; // 默认 1 分钟
}

/**
 * 格式化时间为中文显示
 * @param {number} minutes - 分钟数
 * @returns {string} 格式化的时间字符串
 */
export function formatTime(minutes) {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}秒`;
  }
  if (minutes < 60) {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}小时${mins}分钟`;
}

// ============================================================
// ASCII 进度条
// ============================================================

/**
 * 生成 ASCII 进度条
 * @param {number} progress - 进度百分比 (0-100)
 * @param {object} options - 显示选项
 * @returns {string} 进度条字符串
 */
export function renderProgressBar(progress, options = {}) {
  const {
    width = PROGRESS_BAR_WIDTH,
    filled = '█',
    empty = '░',
    showPercent = true,
    showEta = false,
    etaMinutes = 0,
  } = options;

  const filledCount = Math.round((progress / 100) * width);
  const emptyCount = width - filledCount;

  let bar = `[${filled.repeat(filledCount)}${empty.repeat(emptyCount)}]`;

  if (showPercent) {
    bar += ` ${progress.toFixed(0).padStart(3)}%`;
  }

  if (showEta && progress < 100) {
    bar += `  预计剩余: ${formatTime(etaMinutes)}`;
  }

  return bar;
}

/**
 * 清除当前行并重绘进度条
 * @param {string} content - 要显示的内容
 */
export function clearAndWrite(content) {
  process.stdout.write(`\r${content}${' '.repeat(Math.max(0, 80 - content.length))}`);
}

// ============================================================
// 长任务确认
// ============================================================

/**
 * 显示长任务确认提示
 * @param {string} taskName - 任务名称
 * @param {number} estimatedMinutes - 估算时间（分钟）
 * @returns {Promise<boolean>} 用户是否确认继续
 */
export async function confirmLongTask(taskName, estimatedMinutes) {
  if (estimatedMinutes < LONG_TASK_THRESHOLD_MINUTES) {
    return true; // 短任务直接执行
  }

  return new Promise((resolve) => {
    const timeStr = formatTime(estimatedMinutes);
    const prompt = `\n⚠️  即将执行「${taskName}」，预计需要 ${timeStr}。是否继续？`;

    // 尝试使用 readline（Node.js 内置）
    try {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(prompt + ' (Y/n): ', (answer) => {
        rl.close();
        const confirmed = !answer || answer.toLowerCase().startsWith('y');
        if (!confirmed) {
          console.log('已取消操作。');
        }
        resolve(confirmed);
      });
    } catch {
      // 回退：假设用户确认（CI 环境）
      console.log(prompt + ' (默认 Y)');
      resolve(true);
    }
  });
}

// ============================================================
// 进度追踪器
// ============================================================

/**
 * 创建进度追踪器
 * @param {object} config - 配置
 * @param {string} config.name - 任务名称（中文）
 * @param {string} config.type - 操作类型（用于时间估算）
 * @param {Function} config.estimate - 参数估算函数 (args) => params
 */
export function createProgressTracker(config) {
  const { name, type, estimate } = config;

  let state = {
    progress: 0,
    message: '',
    startTime: null,
    estimatedMinutes: 0,
    isRunning: false,
    shouldContinue: true,
  };

  return {
    /**
     * 启动进度追踪
     * @param {object} args - 操作参数
     * @returns {Promise<{shouldContinue: boolean}>}
     */
    async start(args = {}) {
      // 估算时间
      const params = estimate ? estimate(args) : {};
      state.estimatedMinutes = estimateTime(type, params);
      state.startTime = Date.now();
      state.isRunning = true;

      // 显示启动信息
      console.log(`\n📚 ${name}启动中...`);

      // 长任务确认
      if (state.estimatedMinutes >= LONG_TASK_THRESHOLD_MINUTES) {
        state.shouldContinue = await confirmLongTask(name, state.estimatedMinutes);
      }

      if (!state.shouldContinue) {
        this.stop();
        return { shouldContinue: false };
      }

      // 显示初始进度条
      this.update({ progress: 0, message: '开始执行...' });

      return { shouldContinue: true };
    },

    /**
     * 更新进度
     * @param {object} update
     * @param {number} update.progress - 进度百分比 (0-100)
     * @param {string} [update.message] - 当前操作描述
     */
    update({ progress, message }) {
      if (!state.isRunning) return;

      state.progress = Math.min(100, Math.max(0, progress));
      if (message !== undefined) {
        state.message = message;
      }

      // 计算预计剩余时间
      const elapsedMinutes = (Date.now() - state.startTime) / 60000;
      const etaMinutes = state.estimatedMinutes * (1 - state.progress / 100);

      // 构建进度行
      const progressBar = renderProgressBar(state.progress, {
        showEta: etaMinutes > 0.1,
        etaMinutes,
      });

      const line = `  ${progressBar}  ${state.message}`;

      // 清除当前行并重绘
      clearAndWrite(line);
    },

    /**
     * 标记完成
     * @param {string} [completionMessage] - 完成消息
     */
    complete(completionMessage = '完成') {
      if (!state.isRunning) return;

      state.progress = 100;
      state.isRunning = false;

      // 计算实际耗时
      const elapsedMinutes = (Date.now() - state.startTime) / 60000;

      // 换行并显示完成信息
      console.log('\n'); // 清除单行进度
      console.log(`✅ ${name}${completionMessage !== '完成' ? '：' + completionMessage : ''}`);
      console.log(`   耗时: ${formatTime(elapsedMinutes)}`);

      this.stop();
    },

    /**
     * 标记失败
     * @param {Error} error - 错误对象
     */
    fail(error) {
      if (!state.isRunning) return;

      state.isRunning = false;
      const elapsedMinutes = (Date.now() - state.startTime) / 60000;

      console.log('\n'); // 清除单行进度
      console.error(`❌ ${name}失败`);
      if (error && error.message) {
        console.error(`   错误: ${error.message}`);
      }
      console.error(`   已耗时: ${formatTime(elapsedMinutes)}`);

      this.stop();
    },

    /**
     * 停止追踪
     */
    stop() {
      state.isRunning = false;
      state.progressTimer = null;
    },

    /**
     * 获取当前状态
     */
    getState() {
      return { ...state };
    },
  };
}

// ============================================================
// 便捷函数
// ============================================================

/**
 * 创建带进度追踪的包装函数
 * @param {Function} fn - 要包装的异步函数
 * @param {object} config - 追踪配置
 * @returns {Function} 包装后的函数
 */
export function withProgress(fn, config) {
  const tracker = createProgressTracker(config);

  return async function (...args) {
    const { shouldContinue } = await tracker.start(
      args[0] || {}  // 假设第一个参数是选项对象
    );

    if (!shouldContinue) {
      return null;
    }

    try {
      const result = await fn(...args, tracker);
      tracker.complete();
      return result;
    } catch (error) {
      tracker.fail(error);
      throw error;
    }
  };
}

export default {
  createProgressTracker,
  withProgress,
  estimateTime,
  formatTime,
  renderProgressBar,
  confirmLongTask,
};
