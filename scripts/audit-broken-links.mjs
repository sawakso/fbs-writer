#!/usr/bin/env node
/**
 * audit-broken-links.mjs — 断链审计脚本
 * 扫描 Markdown 文件中的链接，检查本地链接目标是否存在
 */
import fs from 'fs';
import path from 'path';
import { UserError } from './lib/user-errors.mjs';

function parseArgs(argv) {
  const o = { root: process.cwd(), channel: 'all', enforce: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') o.root = argv[++i];
    else if (a === '--channel') o.channel = argv[++i];
    else if (a === '--enforce') o.enforce = true;
  }
  return o;
}

function listMd(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
    }
  }
  return out;
}

function collectSkillScanRoots(root, channel) {
  const scanRoots = [];
  const refNested = path.join(root, 'FBS-BookWriter', 'references');
  const refFlat = path.join(root, 'references');
  const skillNested = path.join(root, 'FBS-BookWriter', 'SKILL.md');
  const skillFlat = path.join(root, 'SKILL.md');

  if (channel === 'user') {
    if (fs.existsSync(refNested)) scanRoots.push(refNested);
    else if (fs.existsSync(refFlat)) scanRoots.push(refFlat);
    if (fs.existsSync(skillNested)) scanRoots.push(skillNested);
    else if (fs.existsSync(skillFlat)) scanRoots.push(skillFlat);
  } else {
    if (fs.existsSync(refNested)) scanRoots.push(refNested);
    else if (fs.existsSync(refFlat)) scanRoots.push(refFlat);
    if (fs.existsSync(skillNested)) scanRoots.push(skillNested);
    else if (fs.existsSync(skillFlat)) scanRoots.push(skillFlat);
  }
  return scanRoots;
}

/** 书稿根下无技能包目录时，扫描章节/交付物等 Markdown（Windows 书稿根实测：原逻辑 files=0） */
function collectBookProjectScanRoots(root) {
  const out = [];
  const candidates = ['chapters', 'deliverables', '全稿', 'releases', '.fbs'];
  for (const name of candidates) {
    const p = path.join(root, name);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) out.push(p);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root);

  console.log('🔍 开始断链审计...');
  console.log(`📁 扫描根目录: ${root}`);

  let scanRoots = collectSkillScanRoots(root, args.channel);

  const files = [];
  for (const r of scanRoots) {
    if (r.endsWith('.md')) {
      if (fs.existsSync(r)) files.push(r);
    } else {
      files.push(...listMd(r));
    }
  }

  if (files.length === 0) {
    scanRoots = collectBookProjectScanRoots(root);
    for (const r of scanRoots) {
      files.push(...listMd(r));
    }
  }

  console.log(`📄 发现 ${files.length} 个 Markdown 文件，开始检查断链...`);

  const broken = [];
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = m[1].trim();
      if (!raw || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('#')) continue;
      const filePart = raw.split('#')[0];
      if (!filePart) continue;
      const target = path.resolve(path.dirname(f), filePart);
      if (!fs.existsSync(target)) broken.push({ file: f, link: raw, resolved: target });
    }
  }

  console.log(`audit-broken-links: 扫描文件=${files.length}, 断链=${broken.length}`);

  if (broken.length > 0) {
    console.log('⚠️  发现以下断链:');
    broken.slice(0, 40).forEach((x) => console.log(`  - ${x.file} -> ${x.link}`));
    if (broken.length > 40) {
      console.log(`  ... 还有 ${broken.length - 40} 个断链未显示`);
    }
  }

  if (args.enforce && broken.length > 0) {
    throw new UserError('断链审计', `发现 ${broken.length} 个断链`, {
      code: 'ERR_BROKEN_LINKS',
      details: broken.slice(0, 10)
    });
  }
}

if (process.argv[1] && process.argv[1].endsWith('audit-broken-links.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '断链审计' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}
