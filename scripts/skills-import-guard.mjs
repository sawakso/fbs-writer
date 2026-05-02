#!/usr/bin/env node
export { runSkillImportSecurityScan as runSkillsImportGuard } from './skill-import-security-scan.mjs';
import { runSkillImportSecurityScan } from './skill-import-security-scan.mjs';
import path from 'path';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const out = { skillRoot: process.cwd(), enforce: false, jsonOut: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skill-root') out.skillRoot = path.resolve(argv[++i] || out.skillRoot);
    else if (a === '--enforce') out.enforce = true;
    else if (a === '--json-out') out.jsonOut = path.resolve(argv[++i] || '');
  }
  return out;
}

async function main() {
  console.log('🛡️  技能导入守卫启动...');
  const args = parseArgs(process.argv);
  const out = runSkillImportSecurityScan(args);
  console.log(`[skills-import-guard] status=${out.status} findings=${out.findings.length}`);
  if (out.status === 'passed') {
    console.log('✅ 导入守卫检查通过');
  } else {
    console.log(`⚠️  发现 ${out.findings.length} 项风险，守卫已拦截`);
  }
  process.exit(out.code);
}

if (process.argv[1] && process.argv[1].endsWith('skills-import-guard.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '技能导入守卫' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
