#!/usr/bin/env node
import { UserError } from './lib/user-errors.mjs';
export { evaluateCommandApproval } from './command-approval-policy.mjs';
import { evaluateCommandApproval } from './command-approval-policy.mjs';

function parseArgs(argv) {
  const out = { command: '', json: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--command') out.command = argv[++i] || '';
    else if (argv[i] === '--json') out.json = true;
  }
  if (!out.command) out.command = argv.slice(2).filter((x) => x !== '--json').join(' ').trim();
  return out;
}

function main() {
  console.log('[approval-policy] 开始评估命令审批策略...');
  const args = parseArgs(process.argv);
  const out = evaluateCommandApproval(args.command);
  if (args.json) console.log(JSON.stringify(out, null, 2));
  else console.log(`[approval-policy] 结果: ${out.approval} (${out.riskLevel})`);
  process.exit(out.approval === 'deny' ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith('approval-policy.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '审批策略' }))
    .catch((err) => {
      console.error('无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
