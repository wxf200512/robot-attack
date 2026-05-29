// Dev-only side-effect module. Installs a no-op FBInstant + fbq on window so the
// template can run outside the Facebook Instant Games sandbox during `npm run dev`.
// Must be imported BEFORE any other module that touches FBInstant.
//
// 用法（main.tsx 顶部）：
//   import './devMock';
//
// 生产构建中 import.meta.env.DEV 为 false，整段会被 Vite 树摇掉。
//
// 测深链：临时把 getEntryPointData 改成返回 { game: '<你的 payloadKey>' } 即可。

if (import.meta.env.DEV) {
  const noop = () => {};
  const ad = {
    loadAsync: () => Promise.resolve(),
    showAsync: () => Promise.resolve(),
  };

  // 无条件覆盖：index.html 引入的真实 FBInstant SDK 在浏览器里 initializeAsync 会永远 hang，
  // 必须用 mock 替掉，否则 FBLoader 永远不 resolve、React 永远不渲染（白屏）。
  (window as any).FBInstant = {
    initializeAsync: () => Promise.resolve(),
    startGameAsync: () => Promise.resolve(),
    setLoadingProgress: noop,
    getEntryPointData: () => null, // 测深链时改这里返回 { game: 'xxx' }
    getPlatform: () => 'WEB',
    getLocale: () => 'en_US',
    getSupportedAPIs: () => [],
    logEvent: noop,
    getInterstitialAdAsync: () => Promise.resolve(ad),
    getRewardedVideoAsync: () => Promise.resolve(ad),
    loadBannerAdAsync: () => Promise.resolve(),
    hideBannerAdAsync: () => Promise.resolve(),
    player: {
      getID: () => 'dev-local-player',
      getName: () => 'Dev Player',
      getPhoto: () => '',
      getSignedPlayerInfoAsync: () =>
        Promise.resolve({ getSignature: () => '' }),
      canSubscribeBotAsync: () => Promise.resolve(false),
      subscribeBotAsync: () => Promise.resolve(),
    },
    context: {
      getID: () => null,
      getType: () => 'SOLO',
    },
  };

  // fbq 在 index.html 里已经被 IIFE 装成 queue-only stub，不会阻塞渲染；
  // 如果想完全静默不发任何 Pixel 请求，把它也覆盖：
  if (typeof (window as any).fbq !== 'function') {
    const fbqNoop: any = () => {};
    fbqNoop.queue = [];
    (window as any).fbq = fbqNoop;
  }

  console.log('[devMock] FBInstant dev stub installed (forced override)');
}

export {};
