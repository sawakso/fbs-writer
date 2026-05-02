#!/usr/bin/env node
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { appendBookStateEvent } from "./lib/book-state-db.mjs";
import { UserError } from "./lib/user-errors.mjs";

const VALID_STATES = new Set(["draft", "candidate", "release", "archived"]);
const ALLOWED_TRANSITIONS = {
  draft: new Set(["candidate"]),
  candidate: new Set(["draft", "release"]),
  release: new Set(["candidate", "archived"]),
  archived: new Set([]),
};

function parseArgs(argv) {
  const o = {
    bookRoot: null,
    action: "status",
    to: null,
    artifact: null,
    reason: "",
    actor: "fbs-agent",
    force: false,
    json: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--book-root") o.bookRoot = path.resolve(argv[++i] || "");
    else if (a === "--action") o.action = argv[++i] || "status";
    else if (a === "--to") o.to = argv[++i] || "";
    else if (a === "--artifact") o.artifact = argv[++i] || "";
    else if (a === "--reason") o.reason = argv[++i] || "";
    else if (a === "--actor") o.actor = argv[++i] || "fbs-agent";
    else if (a === "--force") o.force = true;
    else if (a === "--json") o.json = true;
  }
  return o;
}

function ensureFbsDir(bookRoot) {
  const fbsDir = path.join(bookRoot, ".fbs");
  fs.mkdirSync(fbsDir, { recursive: true });
  return fbsDir;
}

function statePath(fbsDir) {
  return path.join(fbsDir, "final-draft-state.json");
}

function hashFile(filePath) {
  const raw = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function readState(bookRoot) {
  const fbsDir = ensureFbsDir(bookRoot);
  const p = statePath(fbsDir);
  if (!fs.existsSync(p)) {
    return {
      schemaVersion: "1.0.0",
      currentState: "draft",
      updatedAt: null,
      updatedBy: null,
      currentArtifact: null,
      currentHash: null,
      transitionHistory: [],
    };
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {
      schemaVersion: "1.0.0",
      currentState: "draft",
      updatedAt: null,
      updatedBy: null,
      currentArtifact: null,
      currentHash: null,
      transitionHistory: [],
    };
  }
}

function writeState(bookRoot, state) {
  const fbsDir = ensureFbsDir(bookRoot);
  const p = statePath(fbsDir);
  fs.writeFileSync(p, JSON.stringify(state, null, 2) + "\n", "utf8");
  return p;
}

function ensureTransitionAllowed(fromState, toState, force = false) {
  if (!VALID_STATES.has(toState)) {
    throw new Error(`invalid target state: ${toState}`);
  }
  if (!VALID_STATES.has(fromState)) {
    throw new Error(`invalid current state: ${fromState}`);
  }
  if (force) return;
  const allowed = ALLOWED_TRANSITIONS[fromState] || new Set();
  if (!allowed.has(toState)) {
    throw new Error(`transition not allowed: ${fromState} -> ${toState}`);
  }
}

function toRelative(bookRoot, maybePath) {
  if (!maybePath) return null;
  const abs = path.resolve(bookRoot, maybePath);
  if (!fs.existsSync(abs)) return null;
  return path.relative(bookRoot, abs).replace(/\\/g, "/");
}

function appendTransition(state, item) {
  const history = Array.isArray(state.transitionHistory) ? state.transitionHistory : [];
  history.push(item);
  state.transitionHistory = history.slice(-200);
}

export function runFinalDraftStateMachine({
  bookRoot,
  action = "status",
  to,
  artifact,
  reason = "",
  actor = "fbs-agent",
  force = false,
}) {
  if (!bookRoot) {
    throw new UserError('定稿状态机', '缺少 --book-root 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --book-root <书稿根目录>'
    });
  }
  const state = readState(bookRoot);
  if (action === "status") {
    return { code: 0, message: "ok", state };
  }
  if (action !== "transition") {
    throw new UserError('定稿状态机', `不支持的操作: ${action}`, {
      code: 'ERR_INVALID_ACTION',
      solution: '请使用 --action status 或 --action transition'
    });
  }
  const target = String(to || "").trim().toLowerCase();
  if (!target) {
    throw new UserError('定稿状态机', '缺少 --to 参数', {
      code: 'ERR_MISSING_ARGS',
      solution: '请使用 --to <目标状态> 指定转换目标状态'
    });
  }
  try {
    ensureTransitionAllowed(state.currentState, target, !!force);
  } catch (error) {
    throw new UserError('定稿状态机', error.message, {
      code: 'ERR_TRANSITION_NOT_ALLOWED',
      solution: `当前状态: ${state.currentState}，允许转换到: ${[...ALLOWED_TRANSITIONS[state.currentState] || []].join(', ') || '无'}`
    });
  }

  const now = new Date().toISOString();
  const relArtifact = toRelative(bookRoot, artifact);
  const absArtifact = relArtifact ? path.resolve(bookRoot, relArtifact) : null;
  const artifactHash = absArtifact ? hashFile(absArtifact) : null;
  const from = state.currentState;

  state.currentState = target;
  state.updatedAt = now;
  state.updatedBy = actor;
  if (relArtifact) state.currentArtifact = relArtifact;
  if (artifactHash) state.currentHash = artifactHash;

  appendTransition(state, {
    at: now,
    from,
    to: target,
    actor,
    reason: reason || "",
    artifact: relArtifact,
    hash: artifactHash,
    force: !!force,
  });

  const p = writeState(bookRoot, state);
  try {
    appendBookStateEvent({
      bookRoot,
      source: "final-draft-state-machine",
      eventType: "final_draft_transition",
      level: "info",
      payload: {
        from,
        to: target,
        actor,
        reason: reason || "",
        artifact: relArtifact,
        hash: artifactHash,
        force: !!force,
      },
    });
  } catch {
    // 轻索引失败不影响主流程
  }
  return {
    code: 0,
    message: "transition recorded",
    statePath: p,
    state,
  };
}

function main() {
  const args = parseArgs(process.argv);
  
  if (!args.json) {
    console.log('[定稿状态机] 开始执行...');
  }
  
  const out = runFinalDraftStateMachine(args);
  
  if (args.json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`[定稿状态机] ${out.message}`);
    if (out.state?.currentState) {
      console.log(`[定稿状态机] 当前状态: ${out.state.currentState}`);
    }
    if (out.statePath) {
      console.log(`[定稿状态机] 状态文件: ${out.statePath}`);
    }
  }
  
  if (!args.json) {
    console.log('[定稿状态机] ✅ 执行完成');
  }
  
  process.exit(out.code);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1].endsWith('final-draft-state-machine.mjs')) {
  import('./lib/user-errors.mjs')
    .then(({ tryMain }) => tryMain(main, { friendlyName: '定稿状态机' }))
    .catch((err) => {
      console.error('❌ 无法加载错误处理模块:', err.message);
      process.exit(1);
    });
}

console.log('✅ 改造完成: final-draft-state-machine.mjs');
