export class GlobalStore {
  private static instance: GlobalStore;

  private userInfo: {
    language: string;
    fb_id: string;
    fb_name: string;
    fb_photo: string;
    payload: any;
    showads_score: number;
  } = {
    language: 'en',
    fb_id: typeof FBInstant !== 'undefined' ? FBInstant.player.getID() : 'dev-local-player',
    fb_name: '',
    fb_photo: '',
    payload: {},
    showads_score: 1,
  };

  private gameConfig: {
    gameId: number;
    isFace: number;
    gender: number;
  } = {
    gameId: 3,
    isFace: 1,
    gender: 2,
  };

  private systemConfig: {
    imageBaseUrl: string;
    apiBaseUrl: string;
  } = {
    imageBaseUrl: import.meta.env.VITE_IMAGE_BASE_URL || '',
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  };

  private constructor() {}

  public static getInstance(): GlobalStore {
    if (!GlobalStore.instance) {
      GlobalStore.instance = new GlobalStore();
    }
    return GlobalStore.instance;
  }

  public init(userInfo: Partial<typeof this.userInfo> = {}) {
    this.userInfo = { ...this.userInfo, ...userInfo };
  }

  public getUserInfo() {
    return { ...this.userInfo };
  }

  public getGameConfig() {
    return { ...this.gameConfig };
  }

  public getSystemConfig() {
    return { ...this.systemConfig };
  }

  public setUserInfo(info: Partial<typeof this.userInfo>) {
    this.userInfo = { ...this.userInfo, ...info };
  }

  public setGameConfig(config: Partial<typeof this.gameConfig>) {
    this.gameConfig = { ...this.gameConfig, ...config };
  }

  public setSystemConfig(config: Partial<typeof this.systemConfig>) {
    this.systemConfig = { ...this.systemConfig, ...config };
  }

  public setGender(gender: number) {
    this.gameConfig.gender = gender;
  }

  public setLanguage(language: string) {
    this.userInfo.language = language;
  }

  public reset() {
    this.userInfo = {
      language: 'en',
      fb_id: typeof FBInstant !== 'undefined' ? FBInstant.player.getID() || '' : 'dev-local-player',
      fb_name: '',
      fb_photo: '',
      payload: {},
      showads_score: 1,
    };
    this.gameConfig = { gameId: 3, isFace: 1, gender: 2 };
  }
}

export const globalStore = GlobalStore.getInstance();
