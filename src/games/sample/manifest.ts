import type { GameManifest } from '../../types';

/**
 * 示例 manifest。复制本文件夹（src/games/sample → src/games/<你的id>）后，
 * 把下面的字段改成你自己的就开工。
 *
 * 字段说明：
 *  - id          唯一标识，[a-z0-9_-]，比如 'spaceship'
 *  - route       路由路径，比如 '/spaceship'。通常等于 '/' + id
 *  - payloadKey  FB Instant 入口 payload.game 的命中值，通常等于 id
 *  - adType      AdService.initInterstitialAd 的 type 参数；如果你不申请专属广告位就保留 'quiz'
 *  - adUnits     合并到主项目前由集成者去 FB Ads Manager 申请后填真值；模板里留 PLACEHOLDER 即可
 *  - title       首页卡片标题，至少要 en；其他语言可省略，回退到 en
 *  - homeCard    cover 给图就用图（放 public/games/<id>/ 下），没图就 cover: null 用 color 兜底
 *  - component   游戏路由组件的 lazy import（保持 () => import('./index') 即可）
 */
const manifest: GameManifest = {
  id: 'sample',
  route: '/sample',
  payloadKey: 'sample',
  adType: 'quiz', // 没专属广告位先用 quiz 占位
  adUnits: {
    ios: 'PLACEHOLDER_IOS',
    android: 'PLACEHOLDER_ANDROID',
  },
  title: {
    en: 'Sample Game',
    zh: '示例游戏',
  },
  homeCard: {
    cover: null, // 有图改成 '/games/sample/home_cover.jpg'
    color: '#3a5a8f',
  },
  component: () => import('./index'),
};

export default manifest;
