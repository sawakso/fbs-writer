#!/usr/bin/env node
/**
 * 策略 C：将 upgrade-diff-scan 结果写入 releases/，便于「装包后能力变更」留档
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserError } from './lib/user-errors.mjs';
import { scanUpgradeDiff } from './upgrade-diff-scan.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { base: null, target: ROOT, head: 120, help: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--base' && argv[i + 1]) args.base = path.resolve(argv[++i]);
    else if (argv[i] === '--target' && argv[i + 1]) args.target = path.resolve(argv[++i]);
    else if (argv[i] === '--head' && argv[i + 1]) args.head = Number(argv[++i]) || 120;
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
  }
  return args;
}

function renderMd(report) {
  const onlyInBase = report.onlyInBase.length
    ? report.onlyInBase.map((file) => `- ${file}`).join('\n')
    : '- 无';
  const onlyInTarget = report.onlyInTarget.length
    ? report.onlyInTarget.map((file) => `- ${file}`).join('\n')
    : '- 无';
  const changed = report.changed.length
    ? report.changed.map((item) => `- ${item.relPath}`).join('\n')
    : '- 无';

  return `# 升级能力摘要（emit-upgrade-summary）

- **baseDir**：${report.baseDir.replace(/\\/g, '/')}
- **targetDir**：${report.targetDir.replace(/\\/g, '/')}
- **生成时间**：${report.generatedAt}

## 汇总

| 指标 | 数量 |
|------|------|
| base 文件 | ${report.summary.baseFiles} |
| target 文件 | ${report.summary.targetFiles} |
| 仅 base | ${report.summary.onlyInBase} |
| 仅 target | ${report.summary.onlyInTarget} |
| 内容变更 | ${report.summary.changed} |

## 仅 base 存在

${onlyInBase}

## 仅 target 存在

${onlyInTarget}

## 内容不同

${changed}

> 由 \`node scripts/emit-upgrade-summary.mjs\` 生成，供发布说明与策略 C 留档。
`;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`用法: node scripts/emit-upgrade-summary.mjs --base <旧版技能根目录> [--target <新版，默认当前仓库>] [--head N]`);
    console.log('');
    console.log('参数说明:');
    console.log('  --base     必填，指定旧版技能根目录');
    console.log('  --target   可选，指定新版技能根目录（默认当前仓库）');
    console.log('  --head     可选，限制文件头行数检查（默认 120）');
    console.log('  --help     显示帮助信息');
    process.exit(0);
  }

  if (!args.base) {
    throw new UserError('升级摘要', '缺少 --base 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --base <旧版技能根目录>'
    });
  }

  console.log('[emit-upgrade-summary] 开始扫描升级差异...');
  console.log(`[emit-upgrade-summary] base: ${args.base}`);
  console.log(`[emit-upgrade-summary] target: ${args.target}`);

  const report = scanUpgradeDiff({
    baseDir: args.base,
    targetDir: args.target,
    head: args.head,
  });

  console.log('[emit-upgrade-summary] 生成摘要报告...');
  const releasesDir = path.join(args.target, 'releases');
  fs.mkdirSync(releasesDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const mdPath = path.join(releasesDir, `upgrade-capability-summary-${stamp}.md`);
  fs.writeFileSync(mdPath, renderMd(report), 'utf8');
  console.log(`[emit-upgrade-summary] 报告已生成: ${mdPath}`);
  console.log('');
  console.log('摘要统计:');
  console.log(`  base 文件: ${report.summary.baseFiles}`);
  console.log(`  target 文件: ${report.summary.targetFiles}`);
  console.log(`  仅 base: ${report.summary.onlyInBase}`);
  console.log(`  仅 target: ${report.summary.onlyInTarget}`);
  console.log(`  内容变更: ${report.summary.changed}`);
  console.log('');
  console.log(JSON.stringify({ markdownPath: mdPath, summary: report.summary }, null, 2));
}

if (process.argv[1] && process.argv[1].endsWith('emit-upgrade-summary.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '升级摘要' }))
    .catch((err) => {
      console.error('无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
