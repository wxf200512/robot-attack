import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    cors: true,
    watch: {
      usePolling: true,
      interval: 200,
    },
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        // FB Instant Games 会 403 运行时动态拉取、未在 index.html 静态声明的 chunk。
        // 内联动态 import → 打成单一 bundle，所有游戏代码进 main，避免懒加载 chunk 被 403。
        inlineDynamicImports: true,
      },
    },
    sourcemap: true,
  },
  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
    },
  },
});
