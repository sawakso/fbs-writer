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
const PROGRESS_BAR_WIDTH = 20;        // 进度条宽度（字符数），SKILL 规范为 20

// 预计算的字符（避免 .repeat() 重复调用）
const PROGRESS_CHARS = {
  filled: Array.from({ length: PROGRESS_BAR_WIDTH }, () => '█').join(''),
  empty: Array.from({ length: PROGRESS_BAR_WIDTH }, () => '░').join(''),
};

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

    // 章节写作：每千字 0.5 分钟（AI 生成，约30秒/千字）
    'write-chapter': (p) => (p.wordCount || 5000) / 1000 * 0.5,

    // 全书写作：根据章节数和字数（实测：4万字约15分钟）
    'write-book': (p) => {
      const chapterTime = (p.chapterCount || 10) * 2;  // 每章 2 分钟（实测约1-2分钟）
      const wordTime = (p.totalWordCount || 50000) / 1000 * 0.5;  // 每千字 0.5 分钟
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
 * 全书写作时间估算（支持 Part/卷 分区）
 * @param {object} params - 书稿参数
 * @param {number} params.totalChapters - 总章节数
 * @param {number} params.completedChapters - 已完成章节数
 * @param {number} params.avgTimePerChapter - 单章平均耗时（分钟），首次按 2 分钟估算
 * @param {Array} params.parts - 分区信息 [{name: 'Part 1', chapters: 10, completed: 10}, ...]
 * @returns {object} { totalMinutes, remainingMinutes, perChapterMinutes, progressPercent }
 */
export function estimateBookWritingTime(params = {}) {
  const {
    totalChapters = 1,
    completedChapters = 0,
    avgTimePerChapter = 0.5,  // 首次按 0.5 分钟/章估算（约30秒，实际情况约1-2分钟/章）
    parts = [],
  } = params;

  const perChapterMinutes = avgTimePerChapter;
  const remainingChapters = totalChapters - completedChapters;
  const remainingMinutes = remainingChapters * perChapterMinutes;
  const totalMinutes = totalChapters * perChapterMinutes;
  const progressPercent = totalChapters > 0
    ? Math.round((completedChapters / totalChapters) * 100)
    : 0;

  // 按 Part 分区估算
  const partEstimates = parts.map(part => ({
    name: part.name,
    chapters: part.chapters,
    completed: part.completed || 0,
    remaining: part.chapters - (part.completed || 0),
    minutes: (part.chapters - (part.completed || 0)) * perChapterMinutes,
  }));

  return {
    totalMinutes: Math.round(totalMinutes * 10) / 10,
    remainingMinutes: Math.round(remainingMinutes * 10) / 10,
    perChapterMinutes: Math.round(perChapterMinutes * 10) / 10,
    progressPercent,
    totalChapters,
    completedChapters,
    remainingChapters,
    partEstimates,
  };
}

/**
 * 生成书稿进度汇总文本（用于 AI 回复）
 * @param {object} estimate - estimateBookWritingTime 返回的结果
 * @param {string} bookName - 书名
 * @returns {string} 格式化后的进度汇总文本
 */
export function formatBookProgressSummary(estimate, bookName = '本书') {
  const lines = [];

  lines.push(`📖 ${bookName}`);
  lines.push(`⏱️ 预估总用时：约 ${formatTime(estimate.totalMinutes)}（${estimate.totalChapters} 章 × 平均 ${estimate.perChapterMinutes} 分钟/章）`);
  lines.push(`📊 当前进度：${estimate.completedChapters}/${estimate.totalChapters} 章`);
  lines.push(`⏳ 预计剩余：约 ${formatTime(estimate.remainingMinutes)}`);

  if (estimate.partEstimates.length > 0) {
    lines.push('');  // 空行分隔
    estimate.partEstimates.forEach(part => {
      const status = part.completed >= part.chapters ? '✅' : '📍';
      lines.push(`${status} ${part.name}：${part.chapters} 章，${part.remaining > 0 ? `剩余约 ${formatTime(part.minutes)}` : '已完成'}`);
    });
  }

  return lines.join('\n');
}

/**
 * 格式化时间为中文显示（优化版）
 * @param {number} minutes - 分钟数
 * @returns {string} 格式化的时间字符串
 */
export function formatTime(minutes) {
  if (minutes < 0.1) return '<1秒';
  if (minutes < 1) return `${Math.round(minutes * 60)}秒`;
  if (minutes < 60) {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    if (secs === 0) return `${mins}分钟`;
    return `${mins}分${secs}秒`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
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
    showPercent = true,
    showEta = false,
    etaMinutes = 0,
  } = options;

  // 使用预计算的字符，直接截取
  const filledCount = Math.round((progress / 100) * PROGRESS_BAR_WIDTH);
  const filled = PROGRESS_CHARS.filled.substring(0, filledCount);
  const empty = PROGRESS_CHARS.empty.substring(filledCount);

  let bar = `${filled}${empty}`;

  if (showPercent) {
    bar = `${bar} ${Math.round(progress).toString().padStart(3)}%`;
  }

  if (showEta && progress < 100) {
    bar = `${bar} 预计还需:${formatTime(etaMinutes)}`;
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
// 进度追踪器（仅长任务启用）
// ============================================================

/**
 * 创建进度追踪器
 * @param {object} config - 配置
 * @param {string} config.name - 任务名称（中文）
 * @param {string} config.type - 操作类型（用于时间估算）
 * @param {Function} config.estimate - 参数估算函数 (args) => params
 * @param {number} [config.forceShow] - 强制显示（忽略阈值）
 */
export function createProgressTracker(config) {
  const { name, type, estimate, forceShow = false } = config;

  let state = {
    progress: 0,
    message: '',
    startTime: null,
    estimatedMinutes: 0,
    isRunning: false,
    shouldContinue: true,
    enabled: false,  // 是否启用进度显示
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

      // 判断是否需要显示进度（长任务 or 强制显示）
      state.enabled = forceShow || state.estimatedMinutes >= LONG_TASK_THRESHOLD_MINUTES;

      if (!state.enabled) {
        // 短任务：不显示进度条，直接执行
        state.isRunning = true;
        return { shouldContinue: true, skipProgress: true };
      }

      // 长任务：显示确认提示
      state.isRunning = true;
      console.log(`\n📚 ${name}启动中...`);

      state.shouldContinue = await confirmLongTask(name, state.estimatedMinutes);
      if (!state.shouldContinue) {
        this.stop();
        return { shouldContinue: false };
      }

      // 显示初始进度条
      this.update({ progress: 0, message: '开始执行...' });

      return { shouldContinue: true, skipProgress: false };
    },

    /**
     * 更新进度
     * @param {object} update
     * @param {number} update.progress - 进度百分比 (0-100)
     * @param {string} [update.message] - 当前操作描述
     */
    update({ progress, message }) {
      if (!state.isRunning) return;

      // 短任务不显示进度
      if (!state.enabled) return;

      const clampedProgress = progress < 0 ? 0 : progress > 100 ? 100 : progress;
      if (message !== undefined) state.message = message;

      // 只在进度变化 >5% 或消息变化时才输出（避免频繁刷新）
      const prevProgress = state.progress;
      if (Math.abs(clampedProgress - prevProgress) < 5 && message === state.message) {
        return;
      }

      state.progress = clampedProgress;

      // 构建进度行（简化版）
      const filledCount = Math.round((clampedProgress / 100) * PROGRESS_BAR_WIDTH);
      const filled = PROGRESS_CHARS.filled.substring(0, filledCount);
      const empty = PROGRESS_CHARS.empty.substring(filledCount);
      const etaMinutes = state.estimatedMinutes * (1 - clampedProgress / 100);

      let line = `${filled}${empty} ${Math.round(clampedProgress)}%`;
      if (clampedProgress < 100 && etaMinutes > 0.1) {
        line += ` 预计还需:${formatTime(etaMinutes)}`;
      }
      if (state.message) line += ` ${state.message}`;

      clearAndWrite(line);
    },

    /**
     * 标记完成
     * @param {string} [completionMessage] - 完成消息
     */
    complete(completionMessage = '完成') {
      if (!state.isRunning) return;

      state.isRunning = false;
      state.progress = 100;

      // 短任务：只输出完成消息
      if (!state.enabled) {
        console.log(`✅ ${name}${completionMessage !== '完成' ? '：' + completionMessage : ''}`);
        this.stop();
        return;
      }

      // 长任务：清除进度条，显示完成信息
      console.log('\n'); // 清除单行进度
      console.log(`✅ ${name}${completionMessage !== '完成' ? '：' + completionMessage : ''}`);
      
      const elapsedMinutes = (Date.now() - state.startTime) / 60000;
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

      // 短任务：只输出错误消息
      if (!state.enabled) {
        console.error(`❌ ${name}失败`);
        if (error && error.message) {
          console.error(`   错误: ${error.message}`);
        }
        this.stop();
        return;
      }

      // 长任务：清除进度条，显示错误信息
      console.log('\n'); // 清除单行进度
      console.error(`❌ ${name}失败`);
      if (error && error.message) {
        console.error(`   错误: ${error.message}`);
      }
      const elapsedMinutes = (Date.now() - state.startTime) / 60000;
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
    const result = await tracker.start(args[0] || {});

    // 短任务：直接执行，不追踪进度
    if (result.skipProgress) {
      try {
        const output = await fn(...args, null);  // 传入 null 表示无进度追踪
        console.log(`✅ ${config.name}完成`);
        return output;
      } catch (error) {
        console.error(`❌ ${config.name}失败: ${error.message}`);
        throw error;
      }
    }

    // 长任务：带进度追踪执行
    if (!result.shouldContinue) {
      return null;
    }

    try {
      const output = await fn(...args, tracker);
      tracker.complete();
      return output;
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
