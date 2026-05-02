#!/usr/bin/env node
/**
 * S4 章节合并（跨平台 Node，替代 bash/bat，避免 Windows 下 $ 与 shell 嵌套问题）
 *
 * 用法：
 *   node scripts/merge-chapters.mjs --book-root <本书根> --output <输出.md> [--glob "<glob>"] [--dry-run] [--no-backup]
 *
 * 若输出文件已存在：默认先复制为 *.merge-backup-<UTC时间戳>.md 再覆盖（可用 --no-backup 关闭）。
 * --dry-run 仅打印预计合并范围与字符数，不写盘。
 * --record-artifacts 合并成功后写入 `.fbs/merge-chapters.last.json`（便于与 release-governor / 台账对齐；不自动改 chapter-status）。
 *
 * 默认 glob：相对于 book-root 的 chapters 下全部 md；若不存在则回退为按文件名匹配的 S3 章节模式（见 pickDefaultGlob）
 *
 * 特性：
 * - 统一异常捕获（用户友好的中文错误提示）
 * - 进度追踪（长任务显示进度条）
 * - 时间估算（自动估算任务耗时）
 */
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { upsertBookSnippetIndex } from './lib/fbs-book-snippet-index.mjs';
import { UserError } from './lib/user-errors.mjs';
import iconv from 'iconv-lite';

function parseArgs(argv) {
  const o = {
    bookRoot: '',  // 默认为空，要求显式提供
    output: null,
    glob: null,
    title: null,
    dryRun: false,
    noBackup: false,
    recordArtifacts: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--book-root') o.bookRoot = path.resolve(argv[++i] || '');
    else if (a === '--output' || a === '-o') o.output = argv[++i];
    else if (a === '--glob' || a === '-g') o.glob = argv[++i];
    else if (a === '--title') o.title = argv[++i];
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--no-backup') o.noBackup = true;
    else if (a === '--record-artifacts') o.recordArtifacts = true;
  }
  return o;
}

function countNonWhitespaceChars(s) {
  return String(s).replace(/\s+/g, '').length;
}

function backupIfExists(outAbs, noBackup) {
  if (noBackup || !fs.existsSync(outAbs)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = `${outAbs}.merge-backup-${stamp}.md`;
  try {
    fs.copyFileSync(outAbs, bak);
    return bak;
  } catch {
    return null;
  }
}

function pickDefaultGlob(root) {
  const chapters = path.join(root, 'chapters');
  if (fs.existsSync(chapters)) return 'chapters/**/*.md';
  return '**/[S3-Ch*.md';
}

function recordMergeArtifacts(bookRoot, payload) {
  const fbs = path.join(bookRoot, '.fbs');
  try {
    fs.mkdirSync(fbs, { recursive: true });
    fs.writeFileSync(path.join(fbs, 'merge-chapters.last.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  } catch {
    /* ignore */
  }
}

function extractChapterNumber(filename) {
  const base = path.basename(filename);

  // 第X章 / 第X篇（阿拉伯数字）
  let match = base.match(/第\s*(\d+)\s*[章节篇]/);
  if (match) return parseInt(match[1], 10);

  // 第X章 / 第X篇（中文数字）
  match = base.match(/第\s*([零一二三四五六七八九十]+)\s*[章节篇]/);
  if (match) {
    const map = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
    const str = match[1];
    if (map[str] !== undefined) return map[str];
    // 十一～十九
    if (str.startsWith('十') && str.length === 2) return 10 + (map[str[1]] || 0);
    // 二十～九十九
    if (str.length >= 2 && map[str[0]] !== undefined && str[1] === '十') {
      const tens = map[str[0]] * 10;
      if (str.length === 2) return tens;
      return tens + (map[str[2]] || 0);
    }
  }

  // Chapter-X
  match = base.match(/Chapter\s*(\d+)/i);
  if (match) return parseInt(match[1], 10);

  // 提取任意数字
  match = base.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);

  return -1;
}

function readFileAutoEncoding(filePath) {
  const buffer = fs.readFileSync(filePath);
  const utf8Text = buffer.toString('utf8');

  // UTF-8 解码后出现替换字符 → 大概率不是 UTF-8
  if (!utf8Text.includes('\uFFFD')) {
    return utf8Text;
  }

  // 尝试 GBK（中文 Windows 常见编码）
  try {
    return iconv.decode(buffer, 'gbk');
  } catch (e) {
    return utf8Text;
  }
}

function naturalSortPaths(paths) {
  return [...paths].sort((a, b) => {
    const numA = extractChapterNumber(a);
    const numB = extractChapterNumber(b);

    if (numA >= 0 && numB >= 0) return numA - numB;
    if (numA >= 0) return -1;
    if (numB >= 0) return 1;

    return a.localeCompare(b, 'zh-Hans-CN', { numeric: true });
  });
}

async function main() {
  const args = parseArgs(process.argv);
  
  // 先检查是否提供了 --book-root 参数
  if (!args.bookRoot) {
    throw new UserError('章节合并', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请指定书稿根目录，例如：--book-root .'
    });
  }
  
  const root = path.resolve(args.bookRoot);

  if (!fs.existsSync(root)) {
    throw new UserError('章节合并', `书稿目录不存在：${root}`, {
      code: 'ENOENT',
      solution: '请检查 --book-root 参数指定的路径是否正确'
    });
  }

  if (!args.output) {
    throw new UserError('章节合并', '缺少 --output 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请指定输出文件名，例如：--output output.md'
    });
  }

  const outAbs = path.isAbsolute(args.output) ? args.output : path.join(root, args.output);
  const pattern = args.glob || pickDefaultGlob(root);
  let files = globSync(pattern, {
    cwd: root,
    absolute: true,
    nodir: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/.fbs/**', '**/qc-output/**'],
  }).filter((f) => f.toLowerCase().endsWith('.md'));

  files = naturalSortPaths(files);
  if (!files.length) {
    throw new UserError('章节合并', `未找到符合 "${pattern}" 的 Markdown 文件`, {
      code: 'ENOENT',
      solution: '请检查 chapters 目录是否存在，或指定正确的 --glob 模式'
    });
  }

  // 进度追踪
  console.log(`\n📚 章节合并`);

  const iso = new Date().toISOString();
  const title = args.title || path.basename(outAbs, '.md');
  const chunks = [`# ${title} - 全稿`, '', `> 生成时间（UTC）：${iso}`, '', '---', ''];

  // 显示进度
  console.log(`   找到 ${files.length} 个章节文件`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const progress = Math.round((i / files.length) * 80); // 80% 用于读取文件

    // 简单的文本进度指示
    if (files.length > 5) {
      process.stdout.write(`\r   读取中: [${'█'.repeat(Math.round(progress / 5))}${'░'.repeat(20 - Math.round(progress / 5))}] ${(progress).toFixed(0)}%  ${path.basename(file)}`);
    }

    chunks.push(`<!-- source: ${rel} -->`, '');
    chunks.push(readFileAutoEncoding(file).replace(/\r\n/g, '\n').trimEnd());
    chunks.push('', '');
  }

  // 清除进度行
  if (files.length > 5) {
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
  }

  const body = chunks.join('\n');
  const mergedNonWs = countNonWhitespaceChars(body);

  if (args.dryRun) {
    console.log(
      `[dry-run] merge-chapters: 将合并 ${files.length} 个源文件 → ${outAbs}；` +
        `预计本输出文件非空白字符约 ${mergedNonWs}（口径：合并稿全文；与单章台账/扩写门禁字数可能不同）`,
    );
    return;
  }

  const bakPath = backupIfExists(outAbs, args.noBackup);
  if (bakPath) {
    console.log(`   📦 已备份既有文件 → ${path.basename(bakPath)}`);
  }

  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, body, 'utf8');

  // 成功提示
  console.log(`\n✅ 章节合并完成`);
  console.log(`   已合并 ${files.length} 个章节文件`);
  console.log(`   输出文件: ${path.relative(root, outAbs).replace(/\\/g, '/')}`);
  console.log(`   总字符数（不含空白）: ${mergedNonWs.toLocaleString()}`);

  if (args.recordArtifacts) {
    recordMergeArtifacts(root, {
      schemaVersion: '1.0.0',
      mergedAt: iso,
      bookRoot: root,
      outputPath: outAbs,
      outputRelative: path.relative(root, outAbs).replace(/\\/g, '/'),
      sourceFileCount: files.length,
      mergedNonWhitespaceChars: mergedNonWs,
      globPattern: pattern,
      sourcesSample: files.slice(0, 8).map((f) => path.relative(root, f).replace(/\\/g, '/')),
      hint:
        '合并记录已写入 .fbs/merge-chapters.last.json。终稿登记请仍走 release-governor / final-draft-state-machine；台账字数可运行 sync-chapter-status-chars。',
    });
    console.log(`   📝 已记录元数据 → .fbs/merge-chapters.last.json`);
  }

  try {
    upsertBookSnippetIndex(root);
  } catch {
    /* 索引更新失败不阻塞合并 */
  }
}

// 使用 tryMain 包装，支持用户友好的错误提示（带超时保护）
Promise.race([
  import('./lib/user-errors.mjs'),
  new Promise((_, reject) => setTimeout(() => reject(new Error('导入 user-errors.mjs 超时')), 5000))
])
  .then(({ tryMain }) => tryMain(main, { friendlyName: '章节合并' }))
  .catch((err) => {
    console.error('❌ 无法加载错误处理模块:', err.message);
    console.error('   请确保 fbs-bookwriter-lrz 正确安装');
    process.exit(1);
  });
