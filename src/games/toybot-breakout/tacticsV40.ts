import type { GameState } from './simulation';
import { normalizeGarage, type Garage } from './progression';
import type { MechClass } from './mechs';
export type Trial = 'clean' | 'speed' | 'signature';
export const SECTOR_MECHS:MechClass[]=['pulse','heavy','blade','pulse','blade'];
export const TRIALS:Record<Trial,{name:string;detail:string;badge:string}>={
 clean:{name:'零碰撞',detail:'击败首领，全程不碰撞道路敌人；护盾挡撞也计入',badge:'无瑕驾驶员'},
 speed:{name:'极速突破',detail:'5分钟内完成主线；暂停和剧情不计时',badge:'极速先锋'},
 signature:{name:'机型专精',detail:'使用本区指定机型完成主线',badge:'机型王牌'},
};
export type TacticsV40={trial:Trial|null;firstTrial:boolean;collisions:number;elapsed:number;chainKills:number;chainTriggers:number;guardBreaks:number;windowTicks:number;windows:number;cycleDamage:number;riskIds:number[];riskUntil:number;castCleared:number;castBreaks:number;castParries:number;skillCleared:number;skillBreaks:number;parries:number;parryTicks:number;reflection:number;note:string;noteTicks:number};
export const newTacticsV40=():TacticsV40=>({trial:null,firstTrial:false,collisions:0,elapsed:0,chainKills:0,chainTriggers:0,guardBreaks:0,windowTicks:0,windows:0,cycleDamage:0,riskIds:[],riskUntil:0,castCleared:0,castBreaks:0,castParries:0,skillCleared:0,skillBreaks:0,parries:0,parryTicks:0,reflection:0,note:'',noteTicks:0});
export const copyTacticsV40=(s:TacticsV40)=>({...s,riskIds:[...s.riskIds]});
export const trialKeyV40=(s:GameState)=>s.levelIndex+':'+s.tactics.trial;
export const canTrialV40=(garage:Garage,level:number,trial:unknown):trial is Trial=>typeof trial==='string'&&Object.prototype.hasOwnProperty.call(TRIALS,trial)&&normalizeGarage(garage).completedLevels[level]===true;
export const trialPassedV40=(s:GameState)=>!!s.tactics.trial&&!s.sortie&&s.status==='result'&&s.won&&s.bossDefeated&&s.progress===100&&s.playerHp>0&&s.bots>0&&(s.tactics.trial==='clean'?s.tactics.collisions===0:s.tactics.trial==='speed'?s.tactics.elapsed<=3000:s.mechClass===SECTOR_MECHS[s.levelIndex]);
export const trialBonusV40=(s:GameState)=>trialPassedV40(s)&&s.tactics.firstTrial?2:0;
export function recordTrialV40(g:Garage,s:GameState){const base=normalizeGarage(g);if(!canTrialV40(base,s.levelIndex,s.tactics.trial)||!trialPassedV40(s))return base;const key=trialKeyV40(s);return normalizeGarage({...base,trialClears:[...(base.trialClears??[]),key],trialBadge:key});}
export const trialProgressV40=(s:GameState)=>s.tactics.trial==='clean'?'碰撞 '+s.tactics.collisions+' 次':s.tactics.trial==='speed'?'用时 '+(s.tactics.elapsed/10).toFixed(0)+'/300 秒':'指定 '+({pulse:'脉冲先锋',heavy:'重锤泰坦',blade:'疾刃游侠'}[SECTOR_MECHS[s.levelIndex]]);
export const skillUtilityV40=(s:GameState)=>s.mechClass==='pulse'?'本次清弹 '+s.tactics.castCleared:s.mechClass==='heavy'?'本次压制/破盾 '+s.tactics.castBreaks:'本次格挡 '+s.tactics.castParries;
