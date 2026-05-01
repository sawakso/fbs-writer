import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 测试文件模式
    include: ['scripts/test/**/*.test.mjs'],
    
    // 排除的文件
    exclude: ['node_modules', 'dist', '.fbs'],
    
    // 测试环境
    environment: 'node',
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['scripts/**/*.mjs'],
      exclude: ['scripts/test/**', 'node_modules/**']
    },
    
    // 报告器
    reporters: ['verbose'],
    
    // 超时设置（毫秒）
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
