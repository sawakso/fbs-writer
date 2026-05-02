#!/usr/bin/env node
/**
 * split-workflow-full.mjs — FBS 工作流文件拆分工具
 *
 * 特性：
 * - 将 section-3-workflow.full.md 拆分为 S0-S6 各阶段文件
 * - 统一异常捕获（用户友好的中文错误提示）
 * - 进度显示（显示拆分进度）
 */

import fs from "fs";
import path from "path";
import { UserError } from "./lib/user-errors.mjs";

function parseArgs(argv) {
  const repoRoot = process.cwd();
  const o = {
    fullFile: path.join(repoRoot, "references", "01-core", "section-3-workflow.full.md"),
    outDir: path.join(repoRoot, "references", "01-core", "workflow-volumes"),
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--full-file") o.fullFile = argv[++i];
    else if (a === "--out-dir") o.outDir = argv[++i];
  }
  return o;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function shiftRelativeLinks(markdown) {
  return markdown.replace(/\]\(([^)]+)\)/g, (all, target) => {
    const t = String(target || "").trim();
    if (!t || t.startsWith("http://") || t.startsWith("https://") || t.startsWith("#")) return all;
    if (t.startsWith("./")) return all.replace(t, `../${t.slice(2)}`);
    if (t.startsWith("../")) return all.replace(t, `../${t}`);
    return all;
  });
}

function main() {
  const args = parseArgs(process.argv);
  const fullFile = path.resolve(args.fullFile);
  const outDir = path.resolve(args.outDir);

  // 检查源文件
  if (!fs.existsSync(fullFile)) {
    throw new UserError("工作流拆分", `未找到源文件: ${fullFile}`, {
      code: "ENOENT",
      solution: "请确认 --full-file 指向正确的文件路径"
    });
  }

  const lines = fs.readFileSync(fullFile, "utf8").split(/\r?\n/);

  const starts = {
    S0: 517,
    S1: 789,
    S2: 1032,
    S25: 1161,
    S3: 1215,
    S4: 1781,
    S5: 1896,
    S6: 1987,
  };

  const order = ["S0", "S1", "S2", "S25", "S3", "S4", "S5", "S6"];
  const files = {
    S0: "workflow-s0.md",
    S1: "workflow-s1.md",
    S2: "workflow-s2.md",
    S25: "workflow-s2.5.md",
    S3: "workflow-s3.md",
    S4: "workflow-s4.md",
    S5: "workflow-s5.md",
    S6: "workflow-s6.md",
  };

  // 创建输出目录
  try {
    ensureDir(outDir);
  } catch (err) {
    throw new UserError("工作流拆分", `无法创建输出目录: ${outDir}`, {
      code: "EACCES",
      solution: "请检查目录权限或指定其他输出路径"
    });
  }

  const total = order.length;
  console.log(`\n📦 开始拆分工作流文件（共 ${total} 个阶段）...\n`);

  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    const start = starts[key] - 1;
    const end = i < order.length - 1 ? starts[order[i + 1]] - 2 : lines.length - 1;

    if (start < 0 || start >= lines.length || end < start) {
      console.warn(`⚠️ 跳过 ${key}：索引范围无效`);
      continue;
    }

    const header = `# ${key} 分卷\n\n> 来源：section-3-workflow.full.md（自动切分）\n\n`;
    const bodyRaw = lines.slice(start, end + 1).join("\n");
    const body = shiftRelativeLinks(bodyRaw);
    const outPath = path.join(outDir, files[key]);

    fs.writeFileSync(outPath, header + body + "\n", "utf8");
    console.log(`  ✅ [${i + 1}/${total}] ${key}: ${path.basename(outPath)}`);
  }

  console.log(`\n✨ 工作流拆分完成！输出目录: ${outDir}`);
}

main();

// 使用 tryMain 包装，支持用户友好的错误提示
if (process.argv[1] && process.argv[1].endsWith("split-workflow-full.mjs")) {
  import("./lib/user-errors.mjs")
    .then(({ tryMain }) => tryMain(main, { friendlyName: "工作流拆分" }))
    .catch((err) => {
      console.error("❌ 无法加载错误处理模块:", err.message);
      process.exit(1);
    });
}
