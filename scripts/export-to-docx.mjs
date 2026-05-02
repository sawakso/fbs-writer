#!/usr/bin/env node
/**
 * OpenClaw Markdown 转 DOCX 导出器
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 *
 * 功能:
 * - 将 Markdown 内容转换为 DOCX 格式
 * - 支持中文排版
 * - 支持图片（需本地化）
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

// 预导入依赖（避免运行时动态导入失败导致挂起）
let pkgDocx = null;
let pkgHtmlToDocx = null;

async function ensureDocx() {
  if (!pkgDocx) {
    try {
      pkgDocx = await import('docx');
    } catch (err) {
      throw new Error('缺少必需依赖 "docx"，请运行：npm install docx');
    }
  }
  return pkgDocx;
}

async function ensureHtmlToDocx() {
  if (!pkgHtmlToDocx) {
    try {
      pkgHtmlToDocx = await import('html-to-docx');
    } catch (err) {
      // 可选依赖，不抛出错误
    }
  }
  return pkgHtmlToDocx;
}

/**
 * Markdown 转 DOCX
 * @param {string} markdownContent - Markdown 内容
 * @param {object} options - 选项
 * @param {string} options.title - 文档标题
 * @param {string} options.author - 作者
 * @param {string} options.outputPath - 输出路径
 * @param {Function} options.onProgress - 进度回调 (progress: number, message: string) => void
 */
export async function markdownToDocx(markdownContent, options = {}) {
  const {
    title = 'FBS-BookWriter 文档',
    author = 'FBS-BookWriter',
    outputPath = null,
    onProgress = null,
  } = options;

  // 进度回调辅助函数
  const reportProgress = (progress, message) => {
    if (onProgress) {
      onProgress(progress, message);
    }
  };

  let htmlContent;
  let docxBuffer;

  // 方法一：尝试使用 html-to-docx
  reportProgress(10, '正在解析 Markdown...');
  try {
    const HTMLToDOCX = (await ensureHtmlToDocx())?.default;
    if (HTMLToDOCX) {
      htmlContent = await markdownToHtml(markdownContent);
      reportProgress(40, '正在转换为 DOCX...');
      const docx = await HTMLToDOCX(htmlContent, {
        title,
        author,
      });
      docxBuffer = docx;
    } else {
      throw new Error('html-to-docx 未安装');
    }
  } catch (err) {
    console.warn('[DOCX导出] html-to-docx 失败，使用备选方案:', err.message);

    // 方法二：使用 docx 库直接构建
    try {
      reportProgress(40, '正在使用备选方案构建 DOCX...');
      await ensureDocx();
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = pkgDocx;
      const paragraphs = parseMarkdownToParagraphs(markdownContent, pkgDocx);

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      docxBuffer = await Packer.toBuffer(doc);
    } catch (err2) {
      console.error('[DOCX导出] docx 库也失败:', err2.message);
      throw err2;
    }
  }

  // 输出
  reportProgress(80, '正在保存文件...');
  if (outputPath) {
    fs.writeFileSync(outputPath, docxBuffer);
    reportProgress(100, '导出完成');
    return outputPath;
  }

  reportProgress(100, '导出完成');
  return docxBuffer;
}

/**
 * Markdown 转 HTML（用于 html-to-docx）
 */
async function markdownToHtml(markdownContent) {
  try {
    const MarkdownIt = (await import('markdown-it')).default;
    const footnote = (await import('markdown-it-footnote')).default;

    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
    md.use(footnote);

    return md.render(markdownContent);
  } catch {
    // 降级：简单转换
    return `<html><body><pre>${escapeHtml(markdownContent)}</pre></body></html>`;
  }
}

/**
 * 解析 Markdown 为 docx 段落
 * @param {string} markdownContent - Markdown 内容
 * @param {object} docx - docx 模块（包含 Paragraph, TextRun, HeadingLevel 等）
 */
function parseMarkdownToParagraphs(markdownContent, docx) {
  const { Paragraph, TextRun, HeadingLevel } = docx;

  const paragraphs = [];
  const lines = markdownContent.split('\n');
  let inCodeBlock = false;
  let codeBlockContent = [];

  for (const line of lines) {
    // 代码块
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // 结束代码块
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: codeBlockContent.join('\n'), font: 'Consolas' })],
          shading: { fill: 'f5f5f5' },
        }));
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // 标题
    const h1Match = line.match(/^#\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);

    if (h1Match) {
      paragraphs.push(new Paragraph({
        text: h1Match[1],
        heading: HeadingLevel.HEADING_1,
      }));
      continue;
    }
    if (h2Match) {
      paragraphs.push(new Paragraph({
        text: h2Match[1],
        heading: HeadingLevel.HEADING_2,
      }));
      continue;
    }
    if (h3Match) {
      paragraphs.push(new Paragraph({
        text: h3Match[1],
        heading: HeadingLevel.HEADING_3,
      }));
      continue;
    }

    // 引用
    if (line.startsWith('>')) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: line.slice(1).trim(), italics: true })],
        border: { left: { color: 'auto', size: 1, space: 10, style: 'single' } },
      }));
      continue;
    }

    // 列表项
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    const olMatch = line.match(/^\d+\.\s+(.+)$/);

    if (ulMatch) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: '• ' + ulMatch[1] })],
        bullet: { level: 0 },
      }));
      continue;
    }
    if (olMatch) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: olMatch[1] })],
      }));
      continue;
    }

    // 分割线
    if (/^---+$/.test(line.trim())) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: '' })],
        border: { bottom: { color: 'auto', size: 6, space: 1, style: 'single' } },
      }));
      continue;
    }

    // 普通段落
    if (line.trim()) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: line })],
      }));
    }
  }

  return paragraphs;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ── CLI 入口 ───────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('export-to-docx.mjs')) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`
OpenClaw Markdown 转 DOCX 导出器

用法:
  node export-to-docx.mjs <input.md> [output.docx] [options]

参数:
  input.md       输入 Markdown 文件
  output.docx    输出 DOCX 文件（可选，默认与输入同名）

选项:
  --title <标题>   文档标题
  --author <作者>  文档作者

示例:
  node export-to-docx.mjs chapters/01-intro.md output.docx --title "第一章"
    `);
    process.exit(0);
  }

  const inputPath = args[0];
  const outputPath = args[1] || inputPath.replace(/\.md$/i, '.docx');

  let title = 'FBS-BookWriter 文档';
  let author = 'FBS-BookWriter';

  if (args.includes('--title')) {
    title = args[args.indexOf('--title') + 1];
  }
  if (args.includes('--author')) {
    author = args[args.indexOf('--author') + 1];
  }

  // 导入错误处理模块（带超时保护，避免挂起）
  const userErrorsPromise = import('./lib/user-errors.mjs');
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('导入 user-errors.mjs 超时')), 5000);
  });

  try {
    const { tryMain, withRetry } = await Promise.race([userErrorsPromise, timeoutPromise]);

    await tryMain(async () => {
      console.log(`\n📝 开始导出 DOCX`);
      console.log(`   输入文件: ${inputPath}`);
      console.log(`   输出文件: ${outputPath}`);

      const markdown = fs.readFileSync(inputPath, 'utf8');

      // 进度显示
      const onProgress = (progress, message) => {
        if (progress > 0 && progress < 100) {
          const bar = '█'.repeat(Math.round(progress / 5)) + '░'.repeat(20 - Math.round(progress / 5));
          process.stdout.write(`\r   [${bar}] ${progress.toFixed(0)}% ${message}`);
        }
      };

      // 带重试的 DOCX 导出
      const result = await withRetry(
        async () => {
          return await markdownToDocx(markdown, { title, author, outputPath, onProgress });
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
      console.log(`\n✅ DOCX 导出成功！`);
      console.log(`   输出文件: ${result}`);

      return result;
    }, {
      friendlyName: 'DOCX 导出',
      jsonOutput: false,
    });
  } catch (importErr) {
    console.error('❌ 无法加载错误处理模块:', importErr.message);
    console.error('   请确保 fbs-bookwriter-lrz 正确安装，且 ./lib/user-errors.mjs 文件存在');
    process.exit(1);
  }
}
