import type { ComponentType, LazyExoticComponent } from 'react';

// =========================================
// 游戏 Manifest（每个 src/games/<id>/manifest.ts 默认导出此结构）
// =========================================
export interface GameManifest {
  /** 唯一标识，必须 [a-z0-9_-]，比如 'spaceship' */
  id: string;
  /** 路由路径，比如 '/spaceship' */
  route: string;
  /** FB Instant payload.game 命中值，通常等于 id */
  payloadKey: string;
  /** AdService.initInterstitialAd 的 type 参数；模板里 fallback 'quiz' */
  adType: string;
  /** 合并到主项目前由集成者填真值；模板里可以留 PLACEHOLDER */
  adUnits: {
    ios: string;
    android: string;
  };
  /** 首页卡片标题的多语言映射，至少要有 en */
  title: Record<string, string>;
  /** 首页卡片视觉：有图就用图，没图用 color 兜底 */
  homeCard: {
    cover: string | null;
    color: string;
  };
  /** 路由组件的 lazy import；让首屏只加载首页 */
  component: () => Promise<{ default: ComponentType<any> }>;
}

/** registry 注册项：manifest + 已被 React.lazy 包装的组件 */
export interface RegisteredGame extends GameManifest {
  LazyComponent: LazyExoticComponent<ComponentType<any>>;
}

// =========================================
// 主项目沿用的通用类型（保留 API 兼容）
// =========================================
export interface Game {
  id: number;
  title: string;
  info: string;
  cover_image: string;
  slug: string;
}

export interface GameResponse {
  code: number;
  msg: string;
  data: {
    list: Game[];
    total: number;
    page: number;
    page_size: number;
  };
}
