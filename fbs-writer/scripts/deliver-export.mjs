#!/usr/bin/env node
/**
 * OpenClaw 导出交付脚本
 * FBS-BookWriter v2.1.2 | OpenClaw 适配
 *
 * 功能:
 * - 将导出文件复制到网站可访问目录
 * - 输出可点击的下载链接
 *
 * 用法:
 *   node scripts/deliver-export.mjs <源文件路径> [下载目录URL]
 *
 * 示例:
 *   node scripts/deliver-export.mjs chapters/01-intro.docx http://175.178.72.8/downloads/
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 可配置的下载目录（服务器上可访问的路径）
const DOWNLOAD_SERVER_PATH = '/www/wwwroot/downloads';
const DOWNLOAD_BASE_URL = process.env.DOWNLOAD_BASE_URL || 'http://175.178.72.8/downloads';

function getFileName(filePath) {
  return path.basename(filePath);
}

function getFileExt(filePath) {
  return path.extname(filePath).toLowerCase();
}

function getFileType(filePath) {
  const ext = getFileExt(filePath);
  const types = {
    '.md': '📝 Markdown',
    '.html': '🌐 HTML',
    '.docx': '📘 Word (DOCX)',
    '.pdf': '📖 PDF',
    '.txt': '📄 文本',
    '.zip': '📦 压缩包',
  };
  return types[ext] || '📎 文件';
}

function deliverFile(sourcePath, baseUrl = DOWNLOAD_BASE_URL) {
  // 验证源文件存在
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`源文件不存在: ${sourcePath}`);
  }

  const fileName = getFileName(sourcePath);
  const fileType = getFileType(sourcePath);

  // 确保目标目录存在
  try {
    if (!fs.existsSync(DOWNLOAD_SERVER_PATH)) {
      fs.mkdirSync(DOWNLOAD_SERVER_PATH, { recursive: true });
    }
  } catch (err) {
    // 目录可能无法创建（比如没有权限），跳过但继续
    console.warn(`[交付] 无法创建目录 ${DOWNLOAD_SERVER_PATH}: ${err.message}`);
  }

  // 复制文件到下载目录
  const destPath = path.join(DOWNLOAD_SERVER_PATH, fileName);
  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`[交付] ✅ 文件已复制到: ${destPath}`);
  } catch (err) {
    console.warn(`[交付] ⚠️ 复制失败: ${err.message}`);
    console.log(`[交付] 💡 请手动复制: cp ${sourcePath} ${DOWNLOAD_SERVER_PATH}/`);
  }

  // 生成下载 URL
  const downloadUrl = `${baseUrl}/${encodeURIComponent(fileName)}`;

  // 输出下载链接（Markdown 格式）
  const output = `
## 📥 文件已生成

| 格式 | 文件名 | 下载 |
|------|--------|------|
| ${fileType} | ${fileName} | [点击下载](${downloadUrl}) |

**直接下载链接：** ${downloadUrl}
`;

  return {
    success: true,
    downloadUrl,
    fileName,
    fileType,
    output,
  };
}

// CLI 入口
if (process.argv[1] && process.argv[1].endsWith('deliver-export.mjs')) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`
OpenClaw 导出交付工具

用法:
  node deliver-export.mjs <文件路径> [下载URL]

示例:
  node deliver-export.mjs chapters/01-intro.docx
  node deliver-export.mjs output.pdf http://your-server.com/downloads/

环境变量:
  DOWNLOAD_BASE_URL - 默认下载URL前缀
    `);
    process.exit(0);
  }

  const sourcePath = args[0];
  const baseUrl = args[1] || DOWNLOAD_BASE_URL;

  try {
    const result = deliverFile(sourcePath, baseUrl);
    console.log(result.output);
  } catch (err) {
    console.error('❌ 交付失败:', err.message);
    process.exit(1);
  }
}

export { deliverFile, getFileType, getFileName };
