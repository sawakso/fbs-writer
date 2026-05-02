# FBS-Writer 双通道开发指南

> 本文档描述如何维护和开发 WorkBuddy / OpenClaw / CodeBuddy 三通道适配版本

## 📐 架构概述

```
fbs-bookwriter-lrz/
├── SKILL.md                  # WorkBuddy 入口（YAML frontmatter）
├── README.md                 # WorkBuddy 安装指南
├── scripts/                  # ⭐ 共享代码库（三通道共用）
│   ├── lib/                 # 核心库（user-errors, ux-progress, ...）
│   └── *.mjs                # 172 个入口脚本
├── openclaw/fbs-bookwriter-lrz/     # OpenClaw 适配层
│   ├── skill.json           # OpenClaw 标准配置
│   ├── SKILL.md             # OpenClaw 专用入口
│   ├── index.mjs            # 适配层索引
│   └── adapter/             # 上下文映射器 + 结果格式化器
├── codebuddy/               # CodeBuddy 配置
│   └── channel-manifest.json
├── .codebuddy/              # CodeBuddy agents/providers
├── .codebuddy-plugin/       # CodeBuddy 插件配置
└── docs/                    # 文档
    ├── DEVELOPMENT.md       # 本文档
    └── CHANGELOG.md         # 变更日志
```

## 🎯 设计原则

### 1. 不破坏现有功能

- `scripts/` 目录保持向后兼容
- 所有新增功能使用 `try-catch` 静默降级
- 相对路径引用，让 AI 处理路径问题

### 2. 共享代码库

- **`scripts/` 是共享代码库**，三通道共用
- 新增适配层只添加文件，不修改现有脚本（除非必要）
- 使用 `scripts/lib/` 存放共享工具函数

### 3. 静默降级

```javascript
// 示例：宿主能力检测
try {
  const bridge = await import('./openclaw-host-bridge.mjs');
  const snapshot = bridge.createOpenClawHostSnapshot();
  // 使用 snapshot
} catch (err) {
  // 静默降级，使用默认值
  console.error('[WARN] 宿主桥接失败，使用默认行为:', err.message);
}
```

## 🚀 开发流程

### 新增功能

1. **在 `scripts/lib/` 添加共享代码**
   - 使用 ESM 格式 (`import`/`export`)
   - 添加 JSDoc 注释
   - 导出所有公共接口

2. **修改入口脚本**
   - 优先使用 `tryMain()` 包装 `main()`
   - 添加进度条（长任务 >2 分钟）
   - 使用 `UserError` 抛出友好错误

3. **更新文档**
   - 更新 `SKILL.md`（WorkBuddy 入口）
   - 更新 `openclaw/fbs-bookwriter-lrz/SKILL.md`（OpenClaw 入口）
   - 更新 `CHANGELOG.md`

### 示例：改造现有脚本

**改造前：**
```javascript
#!/usr/bin/env node
import fs from 'fs';

function main() {
  // ... 主逻辑
}

main();
```

**改造后：**
```javascript
#!/usr/bin/env node
import fs from 'fs';
import { tryMain, UserError } from './lib/user-errors.mjs';
import { createProgressTracker } from './lib/ux-progress-enhanced.mjs';

function main() {
  const progress = createProgressTracker(100);
  
  if (!fs.existsSync('./config.json')) {
    throw new UserError('配置文件不存在', 'ENOENT', { path: './config.json' });
  }
  
  // ... 主逻辑
  progress.update(50);
  
  // ... 完成
  progress.done();
}

tryMain(main);
```

## 🧪 测试策略

### 单元测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- scripts/lib/user-errors.test.mjs
```

### 集成测试

```bash
# 测试入口脚本
node scripts/intake-router.mjs --help
node scripts/session-exit.mjs --help
node scripts/env-preflight.mjs --json

# 测试 OpenClaw 适配层
node openclaw/fbs-bookwriter-lrz/index.mjs --test
```

### 跨平台测试

| 平台 | 测试方法 |
|------|----------|
| WorkBuddy | 在 WorkBuddy 中导入技能，执行完整流程 |
| OpenClaw | 在 OpenClaw 中安装技能，执行完整流程 |
| CodeBuddy | 在 CodeBuddy 中安装插件，执行完整流程 |

## 📦 发布流程

### 版本号规则

遵循语义化版本：`MAJOR.MINOR.PATCH`

- `MAJOR`：不兼容的 API 修改
- `MINOR`：向下兼容的功能性新增
- `PATCH`：向下兼容的问题修正

### 发布步骤

1. **更新版本号**
   - `SKILL.md` 中的 `version:` 字段
   - `openclaw/fbs-bookwriter-lrz/skill.json` 中的 `"version"` 字段
   - `package.json` 中的 `"version"` 字段

2. **更新 CHANGELOG.md**
   - 添加新版本的变更记录
   - 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/) 格式

3. **提交代码**
   ```bash
   git add .
   git commit -m "chore: release v2.1.2"
   git tag v2.1.2
   git push origin main --tags
   ```

4. **GitHub Release**
   - 创建 GitHub Release
   - 添加变更日志
   - 上传构建产物（如有）

## 🚨 常见问题

### Q1: 修改 `scripts/` 会影响所有通道吗？

**A**: 是的。`scripts/` 是共享代码库，修改后需要测试所有通道。

### Q2: 如何添加平台特定的功能？

**A**: 使用宿主能力检测：

```javascript
import { detectHostType } from './openclaw-host-bridge.mjs';

const hostType = detectHostType();
if (hostType === 'openclaw') {
  // OpenClaw 特定功能
} else if (hostType === 'workbuddy') {
  // WorkBuddy 特定功能
}
```

### Q3: 如何调试 OpenClaw 适配层？

**A**: 使用 `node --inspect` 调试：

```bash
node --inspect openclaw/fbs-bookwriter-lrz/index.mjs --test
```

然后在 Chrome 中打开 `chrome://inspect` 进行调试。

### Q4: 为什么有些脚本没有改造？

**A**: 优先改造高频脚本（S0-S6 核心流程）。低频脚本可以后续逐步改造。

### Q5: 如何贡献代码？

**A**: 

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📝 代码规范

### JavaScript/Node.js

- 使用 ESM 格式 (`import`/`export`)
- 使用 `async`/`await` 处理异步
- 使用 JSDoc 注释
- 最大行长度：100 字符

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件 | kebab-case | `user-errors.mjs` |
| 函数 | camelCase | `createProgressTracker` |
| 类 | PascalCase | `UserError` |
| 常量 | UPPER_SNAKE_CASE | `ERROR_SCENARIOS` |

### 错误处理

- 使用 `UserError` 抛出用户友好错误
- 使用 `tryMain()` 包装 `main()`
- 记录详细错误到日志文件

## 🔗 相关文档

- [主 README.md](../README.md) - WorkBuddy 安装指南
- [openclaw/README.md](../openclaw/README.md) - OpenClaw 安装指南
- [CHANGELOG.md](./CHANGELOG.md) - 变更日志

---

**维护者**：福帮手团队  
**最后更新**：2026-05-02
