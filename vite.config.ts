import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const singleGameId = process.env.FB_PACKAGE_GAME_ID?.trim();

function singleGameRegistryPlugin() {
  const registryPath = path.resolve(__dirname, 'src/games/registry.ts');
  const registryPathWithoutExt = registryPath.replace(/\.ts$/, '');
  const virtualId = '\0single-game-registry';

  return {
    name: 'single-game-registry',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      if (!singleGameId || !importer || source.startsWith('\0')) return null;

      const importerPath = importer.split('?')[0];
      const resolved = path.resolve(path.dirname(importerPath), source);
      if (resolved === registryPath || resolved === registryPathWithoutExt) {
        return virtualId;
      }

      return null;
    },
    load(id: string) {
      if (id !== virtualId || !singleGameId) return null;

      const manifestPath = `/src/games/${singleGameId}/manifest.ts`;
      return `
import { lazy } from 'react';
import manifestModule from '${manifestPath}';

function validate(m, path) {
  if (!m.id || !/^[a-z0-9_-]+$/.test(m.id)) {
    throw new Error(\`[registry] \${path} 的 manifest.id 非法：\${m.id}（必须 [a-z0-9_-]）\`);
  }
  if (!m.route || !m.route.startsWith('/')) {
    throw new Error(\`[registry] \${path} 的 manifest.route 非法：\${m.route}\`);
  }
  if (!m.title?.en) {
    throw new Error(\`[registry] \${path} 的 manifest.title.en 必填\`);
  }
  if (!m.component) {
    throw new Error(\`[registry] \${path} 缺少 component\`);
  }
  return m;
}

const manifest = validate(manifestModule, '${manifestPath}');

export const registry = [
  {
    ...manifest,
    LazyComponent: lazy(manifest.component),
  },
];

export function findByPayloadKey(key) {
  return registry.find((g) => g.payloadKey === key);
}

export function findByAdType(type) {
  return registry.find((g) => g.adType === type);
}
`;
    },
  };
}

export default defineConfig({
  plugins: [singleGameRegistryPlugin(), react()],
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
