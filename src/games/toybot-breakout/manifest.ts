import type { GameManifest } from '../../types';

const manifest: GameManifest = {
  id: 'toybot-breakout',
  route: '/toybot-breakout',
  payloadKey: 'toybot-breakout',
  adType: 'quiz', // 默认复用平台 quiz 广告位；要专属广告位请改成自己的 adType 并告知集成者
  adUnits: {
    ios: 'PLACEHOLDER_IOS',
    android: 'PLACEHOLDER_ANDROID',
  },
  title: {
    en: "Toybot Breakout",
    zh: "玩具城突围",
  },
  homeCard: {
    cover: null, // 等放图后改成 '/games/toybot-breakout/optimized/home_cover.jpg'
    color: '#3A8DDE',
  },
  component: () => import('./index'),
};

export default manifest;
