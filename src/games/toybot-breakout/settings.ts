export type Quality = 'auto'|'low'|'high';
export type PlayerSettings = { muted:boolean; volume:number; musicVolume?:number; quality:Quality; shake?:boolean };
const KEY='toybot-breakout:settings:v1';
export const normalizeSettings=(value:unknown):PlayerSettings=>{
 const p=value&&typeof value==='object'?value as Partial<PlayerSettings>:{};
 const volume=Number(p.volume);
 return {...(p.musicVolume!==undefined?{musicVolume:Number.isFinite(Number(p.musicVolume))?Math.max(0,Math.min(1,Number(p.musicVolume))):.55}:{}),...(typeof p.shake==='boolean'?{shake:p.shake}:{}),muted:p.muted===true,volume:Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):.45,quality:p.quality==='low'||p.quality==='high'?p.quality:'auto'};
};
export const readSettings=():PlayerSettings=>{try{return normalizeSettings(JSON.parse(window.localStorage.getItem(KEY)||'null'));}catch{return normalizeSettings(null);}};
export const saveSettings=(settings:PlayerSettings)=>{try{window.localStorage.setItem(KEY,JSON.stringify(settings));}catch{/* Session settings remain usable. */}};
export const resolveQuality=(settings:PlayerSettings,cores:number,reducedMotion:boolean)=>settings.quality==='auto'?(reducedMotion||cores>0&&cores<=4?'low':'high'):settings.quality;
