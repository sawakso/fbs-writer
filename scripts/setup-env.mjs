#!/usr/bin/env node
/**
 * FBS-Writer 环境设置向导
 * — 纯交互式，不依赖任何外部路径预设
 *
 * 用法:
 *   node scripts/setup-env.mjs           # 交互模式（推荐）
 *   node scripts/setup-env.mjs --nginx   # 生成 Nginx 配置片段
 *   node scripts/setup-env.mjs --status  # 查看当前配置
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const skillRoot = path.resolve(__dirname, '..');
const ENV_PATH = path.join(skillRoot, '.fbs-env.json');

// ====== 工具函数 ======

function ask(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans.trim()); }));
}

function saveEnv(env) {
  const data = {
    $schema: 'fbs-env-v1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...env,
  };
  fs.writeFileSync(ENV_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✅ 配置已保存: ${ENV_PATH}`);
  return data;
}

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return null;
  return JSON.parse(fs.readFileSync(ENV_PATH, 'utf8'));
}

function generateNginxConf(env) {
  return `# FBS-Writer: 下载文件强制下载（而非浏览器预览）
# 请将此片段放入 server block 中并重载 Nginx：
#   nginx -t && nginx -s reload
location ~ ^/downloads/(.+)\\.(html|pdf)$ {
    add_header Content-Disposition 'attachment; filename="$1.$2"';
}
`;
}

// ====== 主流程 ======

async function main() {
  const args = process.argv.slice(2);

  // --status: 查看当前配置
  if (args.includes('--status')) {
    const env = loadEnv();
    if (!env) {
      console.log('❌ 尚未配置。请运行: node scripts/setup-env.mjs');
      process.exit(0);
    }
    console.log(`\n📋 当前环境配置\n`);
    console.log(`  下载 URL 前缀:     ${env.downloadBaseUrl || '(未设置)'}`);
    console.log(`  本地下载目录:     ${env.downloadServerPath || '(未设置)'}`);
    if (env.domain) console.log(`  域名:              ${env.domain}`);
    if (env.webRoot) console.log(`  网站根目录:        ${env.webRoot}`);
    if (env.nginxExtDir) console.log(`  Nginx 配置目录:    ${env.nginxExtDir}`);
    console.log('');
    return;
  }

  // --nginx: 仅输出 nginx 配置片段（不交互）
  if (args.includes('--nginx')) {
    const env = loadEnv();
    if (!env) {
      console.log(`# 请先运行 node scripts/setup-env.mjs 完成基本配置`);
      console.log(`# 然后运行 node scripts/setup-env.mjs --nginx 生成此文件`);
      process.exit(0);
    }
    console.log(generateNginxConf(env));
    return;
  }

  // ====== 交互模式 ======

  console.log(`\n🔧 FBS-Writer 环境设置`);
  console.log(`  配置将保存到: ${ENV_PATH}\n`);
  console.log(`  留空 = 跳过 / 使用默认值\n`);

  // 检查是否有旧配置
  const old = loadEnv();

  // 1. 域名
  const domainHint = old?.domain || 'example.com';
  const domain = await ask(`域名 (如 ${domainHint}): `) || (old?.domain || '');

  // 2. 协议
  const schemeHint = old?.scheme || 'https';
  const scheme = (await ask(`协议 (${schemeHint}): `) || schemeHint).replace(/:$/, '');

  // 3. 下载目录（本地文件系统路径）
  const pathHint = old?.downloadServerPath || '/var/www/downloads';
  const downloadServerPath = await ask(`下载目录路径 (${pathHint}): `) || pathHint;

  // 4. 可选的网站根目录（用于自动创建下载目录在网站下）
  const webRootHint = old?.webRoot || '';
  const webRoot = await ask(`网站根目录 (留空则不配置): ${webRootHint ? `(${webRootHint})` : ''} `);
  const finalWebRoot = webRoot || old?.webRoot || '';

  // 5. 可选的 Nginx 配置目录
  const nginxHint = old?.nginxExtDir || '';
  const nginxExtDir = await ask(`Nginx 配置目录 (留空则不写入): ${nginxHint ? `(${nginxHint})` : ''} `);
  const finalNginxDir = nginxExtDir || old?.nginxExtDir || '';

  // 6. 拼出 downloadBaseUrl
  let downloadBaseUrl = old?.downloadBaseUrl || '';
  if (domain && !downloadBaseUrl) {
    downloadBaseUrl = `${scheme}://${domain}/downloads`;
    console.log(`  下载 URL: ${downloadBaseUrl}`);
  } else if (!downloadBaseUrl) {
    const customUrl = await ask('下载 URL 前缀 (留空则用本地路径): ');
    if (customUrl) downloadBaseUrl = customUrl;
  }

  // 组装环境配置
  const env = {};
  if (domain) env.domain = domain;
  if (scheme) env.scheme = scheme;
  if (downloadBaseUrl) env.downloadBaseUrl = downloadBaseUrl;
  env.downloadServerPath = downloadServerPath;
  if (finalWebRoot) env.webRoot = finalWebRoot;
  if (finalNginxDir) env.nginxExtDir = finalNginxDir;

  saveEnv(env);

  // 创建下载目录
  try {
    if (!fs.existsSync(downloadServerPath)) {
      fs.mkdirSync(downloadServerPath, { recursive: true });
      console.log(`✅ 已创建下载目录: ${downloadServerPath}`);
    } else {
      console.log(`ℹ️  下载目录已存在: ${downloadServerPath}`);
    }
  } catch (err) {
    console.warn(`⚠️  无法创建目录: ${err.message}`);
    console.log(`   💡 请手动创建: mkdir -p ${downloadServerPath}`);
  }

  // 如果下载目录不在 webRoot 下，尝试建软链
  if (finalWebRoot) {
    const symlinkTarget = path.join(finalWebRoot, 'downloads');
    if (downloadServerPath !== symlinkTarget && !fs.existsSync(symlinkTarget)) {
      try {
        fs.symlinkSync(downloadServerPath, symlinkTarget);
        console.log(`✅ 已创建软链: ${symlinkTarget} → ${downloadServerPath}`);
      } catch (err) {
        console.warn(`⚠️  无法创建软链: ${err.message}`);
        console.log(`   💡 如需让网站能访问下载目录，手动执行:`);
        console.log(`      ln -s ${downloadServerPath} ${symlinkTarget}`);
      }
    }
  }

  // 写入 Nginx 配置
  if (finalNginxDir) {
    const nginxConf = generateNginxConf(env);
    const nginxDest = path.join(finalNginxDir, 'fbs-downloads.conf');
    try {
      fs.writeFileSync(nginxDest, nginxConf, 'utf8');
      console.log(`✅ Nginx 配置已写入: ${nginxDest}`);
      console.log(`   💡 请重载 Nginx: nginx -t && nginx -s reload`);
    } catch (err) {
      console.warn(`⚠️  无法写入 Nginx 配置: ${err.message}`);
      console.log(`   💡 请手动将以下内容放入 Nginx 配置:\n`);
      console.log(nginxConf);
    }
  } else {
    // 即使不自动写入，也在 skill 目录生成一份参考文件
    const refPath = path.join(skillRoot, 'nginx-downloads.conf');
    const nginxConf = generateNginxConf(env);
    fs.writeFileSync(refPath, nginxConf, 'utf8');
    console.log(`ℹ️  未配置 Nginx 自动写入。`);
    console.log(`   💡 参考配置已生成: ${refPath}`);
    console.log(`   💡 请手动将此配置加入 Nginx server block 中。`);
  }

  // 交付脚本当前行为
  console.log(`\n📋 配置摘要:`);
  console.log(`  下载 URL 前缀:     ${downloadBaseUrl || '(未设置，交付时需手动指定)'}`);
  console.log(`  本地下载目录:     ${downloadServerPath}`);
  if (domain) console.log(`  域名:              ${domain}`);
  if (finalNginxDir) console.log(`  Nginx 配置目录:    ${finalNginxDir}`);
  console.log(`\n🎉 完成！`);
  console.log(`  现在可以直接用 deliver-export.mjs 交付文件了。`);
}

function mkdirp(p) {
  try {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  } catch (err) {
    console.warn(`⚠️  无法创建目录 ${p}: ${err.message}`);
  }
}

await main();
