// 模板版 AdService：保留与主项目相同的公共 API，但内部简化：
//   - 广告位 ID 不再硬编码，按 adType 去 registry 里找对应 manifest 的 adUnits，找不到回退到 VITE_FB_AD_UNIT_QUIZ_*
//   - showBlackScreen / showRewardedVideo 的 UI 依赖主项目的 language_quiz + 资源图，模板里只保留接口、内部走 rewarded video 直通流
//   - 集成到主项目时，请用主项目自带的完整 AdService（更复杂的兜底/激励链路）
//
// 本模板下 devMock 会把 FBInstant.getInterstitialAdAsync 等返回 no-op，所以所有方法本地可调，但不会真的弹广告。

import { registry } from '../games/registry';

const QUIZ_IOS = import.meta.env.VITE_FB_AD_UNIT_QUIZ_IOS || '';
const QUIZ_ANDROID = import.meta.env.VITE_FB_AD_UNIT_QUIZ_ANDROID || '';
const BANNER = import.meta.env.VITE_FB_AD_UNIT_BANNER || '';
const REWARDED_IOS = import.meta.env.VITE_FB_AD_UNIT_REWARDED_IOS || '';
const REWARDED_ANDROID = import.meta.env.VITE_FB_AD_UNIT_REWARDED_ANDROID || '';

function resolveAdUnit(type: string): string {
  const platform = (window as any).FBInstant?.getPlatform();
  const isIOS = platform === 'IOS';
  // 先查 game manifest
  const g = registry.find((m) => m.adType === type);
  if (g) {
    return isIOS ? g.adUnits.ios : g.adUnits.android;
  }
  // 回退到 quiz 默认占位
  return isIOS ? QUIZ_IOS : QUIZ_ANDROID;
}

export class AdService {
  static #preloadedInterstitial: any = null;
  static #rewardedVideoRatio: Record<string, number> = {};
  static #firstAdRewardedVideoRatio: Record<string, number> = {};

  static async initInterstitialAd(type: string) {
    const id = resolveAdUnit(type);
    if (!id) {
      console.warn(`[AdService] 找不到 ${type} 的广告位 ID（manifest 未声明且 env 未配置）`);
      return;
    }
    try {
      const interstitial = await FBInstant.getInterstitialAdAsync(id);
      AdService.#preloadedInterstitial = interstitial;
      await interstitial.loadAsync();
      try {
        fbq('trackCustom', 'interstiscalad');
      } catch {
        /* fbq 未加载 */
      }
      window.showinitadssuccess = true;
    } catch (err: any) {
      AdService.#preloadedInterstitial = false;
      window.showinitadssuccess = false;
      window.loadadfail = true;
      console.error(`${type} 广告预加载失败:`, err?.message);
    }
  }

  static async showInterstitialAd(type: string) {
    const lastShowTime = Number(localStorage.getItem('last_ad_time') || 0);
    const now = Date.now();
    if (now - lastShowTime <= 30000) return; // 30s 冷却

    const ad = AdService.#preloadedInterstitial;
    if (!ad || typeof ad.showAsync !== 'function') {
      AdService.initInterstitialAd(type);
      return;
    }

    try {
      await ad.showAsync();
      try {
        fbq('track', 'AddToCart');
        fbq('trackCustom', 'watched_ad');
      } catch {
        /* fbq 未加载 */
      }
      localStorage.setItem('last_ad_time', String(now));
      const adCount = Number(localStorage.getItem('ad_count') || 0) + 1;
      localStorage.setItem('ad_count', String(adCount));
      window.isFisrtshowads = 1;
      // 重新预热
      AdService.initInterstitialAd(type);
    } catch (err: any) {
      console.error('展示插页广告失败:', err?.message);
      AdService.initInterstitialAd(type);
    }
  }

  static async initAndShowInterstitialAd(type: string) {
    const id = resolveAdUnit(type);
    if (!id) return;
    try {
      const interstitial = await FBInstant.getInterstitialAdAsync(id);
      AdService.#preloadedInterstitial = interstitial;
      await interstitial.loadAsync();
      await interstitial.showAsync();
      const now = Date.now();
      localStorage.setItem('last_ad_time', String(now));
      const adCount = Number(localStorage.getItem('ad_count') || 0) + 1;
      localStorage.setItem('ad_count', String(adCount));
      AdService.initInterstitialAd(type);
    } catch (err: any) {
      console.error('init+show 插页广告失败:', err?.message);
    }
  }

  static async showBannerAd() {
    if (!BANNER) return;
    try {
      if (!FBInstant?.getSupportedAPIs?.().includes?.('loadBannerAdAsync')) return;
      await FBInstant.loadBannerAdAsync(BANNER, 'top');
    } catch (err: any) {
      console.error('横幅广告展示失败:', err?.message);
    }
  }

  static async hideBannerAd() {
    try {
      await FBInstant?.hideBannerAdAsync?.();
    } catch (err: any) {
      console.error('隐藏横幅广告失败:', err?.message);
    }
  }

  static showRewardedVideo(
    onSuccess?: () => void,
    onError?: (err: any) => void,
    _type?: string
  ) {
    const platform = FBInstant?.getPlatform?.();
    const id = platform === 'IOS' ? REWARDED_IOS : REWARDED_ANDROID;
    if (!id) {
      console.warn('[AdService] rewarded video 广告位未配置');
      onError?.(new Error('NO_AD_UNIT'));
      return;
    }
    let ad: any = null;
    FBInstant.getRewardedVideoAsync(id)
      .then((rv: any) => {
        ad = rv;
        return ad.loadAsync();
      })
      .then(() => ad.showAsync())
      .then(() => onSuccess?.())
      .catch((err: any) => onError?.(err));
  }

  static async checkAndSubscribeBot() {
    try {
      const canSubscribe = await FBInstant?.player.canSubscribeBotAsync();
      if (canSubscribe) {
        await FBInstant.player.subscribeBotAsync();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('订阅机器人失败:', err?.message);
      return false;
    }
  }

  // 让上层（如果需要）能配置展示比例
  static setRewardedRatio(type: string, ratio: number) {
    AdService.#rewardedVideoRatio[type] = ratio;
  }
  static setFirstAdRewardedRatio(type: string, ratio: number) {
    AdService.#firstAdRewardedVideoRatio[type] = ratio;
  }
}
