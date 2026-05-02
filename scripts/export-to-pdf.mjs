#!/usr/bin/env node
/**
 * OpenClaw Markdown 转 PDF 导出器
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 *
 * 功能:
 * - 将 Markdown 内容转换为 PDF 格式
 * - 使用 puppeteer 渲染 HTML
 * - 支持中文排版
 *
 * 特性:
 * - 统一异常捕获（用户友好的中文错误提示）
 * - 进度追踪（长任务显示进度）
 * - 网络错误重试机制
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Markdown 转 PDF
 * @param {string} markdownContent - Markdown 内容
 * @param {object} options - 选项
 * @param {string} options.title - 文档标题
 * @param {string} options.outputPath - 输出路径
 * @param {Function} options.onProgress - 进度回调 (progress: number, message: string) => void
 */
export async function markdownToPdf(markdownContent, options = {}) {
  const {
    title = 'FBS-BookWriter 文档',
    outputPath = null,
    onProgress = null,
  } = options;

  // 进度回调辅助函数
  const reportProgress = (progress, message) => {
    if (onProgress) {
      onProgress(progress, message);
    }
  };

  // 1. Markdown 转 HTML
  reportProgress(10, '正在解析 Markdown...');
  const htmlContent = await markdownToHtml(markdownContent, title);
  reportProgress(30, 'HTML 转换完成');

  // 2. HTML 转 PDF
  reportProgress(40, '正在启动浏览器...');
  let pdfBuffer;

  try {
    const puppeteer = await import('puppeteer');
    reportProgress(50, '正在启动浏览器...');

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    reportProgress(60, '正在加载内容...');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // 等待字体加载
    await new Promise(r => setTimeout(r, 1000));
    reportProgress(70, '正在生成 PDF...');

    pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; width: 100%; text-align: right; color: #999;">
          <span class="title"></span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; width: 100%; text-align: center; color: #999;">
          <span>第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页</span>
        </div>
      `,
    });

    await browser.close();
    reportProgress(90, 'PDF 生成完成');
  } catch (err) {
    // 导入错误处理模块
    const { RetryableError, wrapError } = await import('./lib/user-errors.mjs');

    // 判断是否是网络相关的可重试错误
    const isNetworkError = err.message && (
      err.message.includes('net::') ||
      err.message.includes('timeout') ||
      err.message.includes('connection')
    );

    if (isNetworkError) {
      throw new RetryableError('PDF 导出', err.message, {
        code: 'ETIMEDOUT',
        solution: '网络不稳定，请稍后重试。',
      });
    }

    throw wrapError('PDF 导出', err);
  }

  // 3. 输出
  if (outputPath) {
    reportProgress(95, '正在保存文件...');
    fs.writeFileSync(outputPath, pdfBuffer);
    reportProgress(100, '导出完成');
    return outputPath;
  }

  reportProgress(100, '导出完成');
  return pdfBuffer;
}

/**
 * Markdown 转 HTML
 */
async function markdownToHtml(markdownContent, title = '文档') {
  let markdownIt;

  try {
    const MarkdownIt = (await import('markdown-it')).default;
    const footnote = (await import('markdown-it-footnote')).default;

    markdownIt = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
    markdownIt.use(footnote);
  } catch {
    // 降级
    markdownIt = {
      render: (md) => `<pre>${escapeHtml(md)}</pre>`
    };
  }

  const bodyHtml = markdownIt.render(markdownContent);
  const css = getPrintCss();

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>
  <article class="fbs-document">
    ${bodyHtml}
  </article>
</body>
</html>`;
}

function getPrintCss() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap');

    * {
      box-sizing: border-box;
    }

    body {
      font-family: "Noto Sans SC", "Source Han Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #333;
      margin: 0;
      padding: 0;
    }

    h1 {
      font-size: 22pt;
      font-weight: bold;
      margin: 24pt 0 12pt 0;
      border-bottom: 2pt solid #333;
      padding-bottom: 6pt;
    }

    h2 {
      font-size: 16pt;
      font-weight: bold;
      margin: 18pt 0 9pt 0;
    }

    h3 {
      font-size: 13pt;
      font-weight: bold;
      margin: 12pt 0 6pt 0;
    }

    p {
      margin: 6pt 0;
      text-align: justify;
    }

    code {
      font-family: "Source Code Pro", Consolas, monospace;
      font-size: 10pt;
      background: #f5f5f5;
      padding: 1pt 3pt;
      border-radius: 2pt;
    }

    pre {
      font-family: "Source Code Pro", Consolas, monospace;
      font-size: 9pt;
      background: #f5f5f5;
      padding: 8pt;
      border-radius: 4pt;
      overflow-x: auto;
      margin: 9pt 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    blockquote {
      margin: 9pt 0;
      padding: 6pt 12pt;
      border-left: 3pt solid #ddd;
      background: #fafafa;
      color: #555;
    }

    ul, ol {
      margin: 6pt 0;
      padding-left: 24pt;
    }

    li {
      margin: 3pt 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 9pt 0;
    }

    th, td {
      border: 0.5pt solid #ddd;
      padding: 4pt 6pt;
      text-align: left;
    }

    th {
      background: #f5f5f5;
      font-weight: bold;
    }

    img {
      max-width: 100%;
      height: auto;
    }

    hr {
      border: none;
      border-top: 0.5pt solid #ddd;
      margin: 12pt 0;
    }

    a {
      color: #0066cc;
      text-decoration: none;
    }

    .fbs-document {
      max-width: 100%;
    }
  `.replace(/\s+/g, ' ');
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ── CLI 入口 ───────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('export-to-pdf.mjs')) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`
📄 OpenClaw Markdown 转 PDF 导出器

用法:
  node export-to-pdf.mjs <input.md> [output.pdf] [options]

参数:
  input.md       输入 Markdown 文件
  output.pdf     输出 PDF 文件（可选，默认与输入同名）

选项:
  --title <标题>   文档标题

示例:
  node export-to-pdf.mjs chapters/01-intro.md output.pdf --title "第一章"
    `);
    process.exit(0);
  }

  const inputPath = args[0];
  const outputPath = args[1] || inputPath.replace(/\.md$/i, '.pdf');

  let title = 'FBS-BookWriter 文档';

  if (args.includes('--title')) {
    title = args[args.indexOf('--title') + 1];
  }

  // 进度显示
  let currentProgress = 0;
  let currentMessage = '';

  const onProgress = (progress, message) => {
    currentProgress = progress;
    currentMessage = message;
    // 简单进度显示
    if (progress > 0 && progress < 100) {
      const bar = '█'.repeat(Math.round(progress / 5)) + '░'.repeat(20 - Math.round(progress / 5));
      process.stdout.write(`\r   [${bar}] ${progress.toFixed(0)}% ${message}`);
    }
  };

  // 导入错误处理模块（带超时保护，避免挂起）
  const userErrorsPromise = import('./lib/user-errors.mjs');
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('导入 user-errors.mjs 超时')), 5000);
  });

  try {
    const { tryMain, withRetry, isRetryable } = await Promise.race([userErrorsPromise, timeoutPromise]);

    await tryMain(async () => {
      console.log(`\n📄 开始导出 PDF`);
      console.log(`   输入文件: ${inputPath}`);
      console.log(`   输出文件: ${outputPath}`);

      const markdown = fs.readFileSync(inputPath, 'utf8');

      // 带重试的 PDF 导出
      const result = await withRetry(
        async () => {
          return await markdownToPdf(markdown, { title, outputPath, onProgress });
        },
        {
          maxRetries: 2,
          baseDelay: 2000,
          onRetry: (attempt, err) => {
            console.log(`\n\n⚠️  第 ${attempt} 次尝试失败: ${err.message}`);
            console.log('   正在重试...\n');
          }
        }
      );

      // 清除进度行
      process.stdout.write('\r' + ' '.repeat(60) + '\r');
      console.log(`\n✅ PDF 导出成功！`);
      console.log(`   输出文件: ${result}`);

      return result;
    }, {
      friendlyName: 'PDF 导出',
      jsonOutput: false,
    });
  } catch (importErr) {
    console.error('❌ 无法加载错误处理模块:', importErr.message);
    console.error('   请确保 fbs-writer 正确安装，且 ./lib/user-errors.mjs 文件存在');
    process.exit(1);
  }
}
