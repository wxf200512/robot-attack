import { lazy } from 'react';
import type { GameManifest, RegisteredGame } from '../types';

// Vite 的 import.meta.glob：模板期就把所有 manifest 拉进来（eager），
// 这样 AdService / App / Home 都能在模块初始化阶段读取。
const manifestModules = import.meta.glob('./*/manifest.ts', { eager: true }) as Record<
  string,
  { default: GameManifest }
>;

function validate(m: GameManifest, path: string): GameManifest {
  if (!m.id || !/^[a-z0-9_-]+$/.test(m.id)) {
    throw new Error(`[registry] ${path} 的 manifest.id 非法：${m.id}（必须 [a-z0-9_-]）`);
  }
  if (!m.route || !m.route.startsWith('/')) {
    throw new Error(`[registry] ${path} 的 manifest.route 非法：${m.route}`);
  }
  if (!m.title?.en) {
    throw new Error(`[registry] ${path} 的 manifest.title.en 必填`);
  }
  if (!m.component) {
    throw new Error(`[registry] ${path} 缺少 component`);
  }
  return m;
}

export const registry: RegisteredGame[] = Object.entries(manifestModules)
  .map(([path, mod]) => {
    const manifest = validate(mod.default, path);
    return {
      ...manifest,
      LazyComponent: lazy(manifest.component as any),
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export function findByPayloadKey(key: string): RegisteredGame | undefined {
  return registry.find((g) => g.payloadKey === key);
}

export function findByAdType(type: string): RegisteredGame | undefined {
  return registry.find((g) => g.adType === type);
}
