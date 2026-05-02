#!/usr/bin/env node
/**
 * OpenClaw 技能包：fbs-bookwriter-lrz（全量适配版）
 * 使用 openclaw/fbs_bookwriter/SKILL.md 作为入口，name 字段为 fbs-bookwriter-lrz
 * 产物：dist/fbs-bookwriter-lrz-v212-openclaw.zip
 */
import { fileURLToPath } from 'url';
import { runChannelPack } from './lib/channel-pack.mjs';

export function runOpenClawPack() {
  return runChannelPack({
    version: '2.1.2',
    packageName: 'fbs-bookwriter-lrz-v212-openclaw',
    packageRootName: 'fbs-bookwriter-lrz',
    channelLabel: 'OpenClaw',
    skillMdOverride: 'openclaw/fbs_bookwriter/SKILL.md',
    // OpenClaw 专用的核心文件（确保打包时包含）
    coreFiles: [
      'scripts/lib/openclaw-host-bridge.mjs',
      'scripts/lib/openclaw-profile-bridge.mjs',
      'scripts/lib/user-errors.mjs',
      'scripts/export-to-docx.mjs',
      'scripts/export-to-pdf.mjs',
      'scripts/deliver-export.mjs',
    ],
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === fileURLToPath(import.meta.url)) {
  runOpenClawPack();
}
