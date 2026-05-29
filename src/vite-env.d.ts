/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_IMAGE_BASE_URL: string;
  readonly VITE_FB_PIXEL_ID: string;
  readonly VITE_FB_APP_ID: string;
  readonly VITE_GA_ID: string;
  readonly VITE_FB_AD_UNIT_QUIZ_IOS: string;
  readonly VITE_FB_AD_UNIT_QUIZ_ANDROID: string;
  readonly VITE_FB_AD_UNIT_BANNER: string;
  readonly VITE_FB_AD_UNIT_REWARDED_IOS: string;
  readonly VITE_FB_AD_UNIT_REWARDED_ANDROID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

// AdService 用的全局 window 字段
declare interface Window {
  FBInstant: any;
  adsFirstRequest: number;
  showinitadssuccess: any;
  loadadfail: any;
  isFisrtshowads: number;
}

// 业务里散布在多处的全局
declare const fbq: any;
declare const FBInstant: any;
