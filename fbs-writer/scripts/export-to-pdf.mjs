#!/usr/bin/env node
/**
 * OpenClaw Markdown 转 PDF 导出器
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 *
 * 功能:
 * - 将 Markdown 内容转换为 PDF 格式
 * - 使用 puppeteer 渲染 HTML
 * - 支持中文排版
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
 */
export async function markdownToPdf(markdownContent, options = {}) {
  const {
    title = 'FBS-BookWriter 文档',
    outputPath = null,
  } = options;

  // 1. Markdown 转 HTML
  const htmlContent = await markdownToHtml(markdownContent, title);

  // 2. HTML 转 PDF
  let pdfBuffer;

  try {
    const puppeteer = await import('puppeteer');

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // 等待字体加载
    await page.waitForTimeout(1000);

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
  } catch (err) {
    console.warn('[PDF导出] puppeteer 失败:', err.message);
    throw new Error('PDF 导出失败，puppeteer 不可用。请安装 puppeteer 或使用 html-to-pdf 替代方案');
  }

  // 3. 输出
  if (outputPath) {
    fs.writeFileSync(outputPath, pdfBuffer);
    return outputPath;
  }

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
OpenClaw Markdown 转 PDF 导出器

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

  try {
    const markdown = fs.readFileSync(inputPath, 'utf8');
    const result = await markdownToPdf(markdown, { title, outputPath });
    console.log(`✅ PDF 导出成功: ${result}`);
  } catch (err) {
    console.error('❌ PDF 导出失败:', err.message);
    process.exit(1);
  }
}
