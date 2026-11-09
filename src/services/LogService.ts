// 日志上报接口
export interface LogPayload {
  id: number;
  click_type: string;
  lange: string;
  share_time?: number;
  from: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export class LogService {
  private static instance: LogService;

  public static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService();
    }
    return LogService.instance;
  }

  private getCurrentLanguage(): string {
    let currentLanguage =
      localStorage.getItem('i18nextLng') || localStorage.getItem('language');

    if (!currentLanguage) {
      try {
        if (typeof (window as any).FBInstant !== 'undefined') {
          const fbLocale = (window as any).FBInstant.getLocale();
          if (typeof fbLocale === 'string' && fbLocale.trim()) {
            const language = fbLocale.trim().substring(0, 2).toLowerCase();
            currentLanguage = language;
            localStorage.setItem('language', language);
            localStorage.setItem('i18nextLng', language);
          }
        }
      } catch (error) {
        console.error('LogService - 获取 FBInstant 语言失败:', error);
      }
    }

    return currentLanguage || 'en';
  }

  public async uploadLog(payload: LogPayload): Promise<boolean> {
    if (!API_BASE) {
      console.log('[LogService] VITE_API_BASE_URL 未配置，跳过上报', payload);
      return false;
    }
    try {
      const response = await fetch(`${API_BASE}/analyse/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.ok;
    } catch (error) {
      console.error('日志上报出错:', error);
      return false;
    }
  }

  public static reportOriginalPlay(gameId: number, language?: string): void {
    const service = LogService.getInstance();
    service.uploadLog({
      id: gameId,
      click_type: 'original_play',
      lange: language || service.getCurrentLanguage(),
      share_time: Math.floor(Date.now() / 1000),
      from: 'fb',
    });
  }

  public static reportReferredPlay(gameId: number, language?: string): void {
    const service = LogService.getInstance();
    service.uploadLog({
      id: gameId,
      click_type: 'referred_play',
      lange: language || service.getCurrentLanguage(),
      share_time: Math.floor(Date.now() / 1000),
      from: 'fb',
    });
  }

  public static reportShare(gameId: number, language?: string): void {
    const service = LogService.getInstance();
    service.uploadLog({
      id: gameId,
      click_type: 'share',
      lange: language || service.getCurrentLanguage(),
      share_time: Math.floor(Date.now() / 1000),
      from: 'fb',
    });
  }

  public static reportRecommendPlay(gameId: number, language?: string): void {
    const service = LogService.getInstance();
    service.uploadLog({
      id: gameId,
      click_type: 'recommend_play',
      lange: language || service.getCurrentLanguage(),
      share_time: Math.floor(Date.now() / 1000),
      from: 'fb',
    });
  }
}

export default LogService;
