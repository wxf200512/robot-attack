import { PRELUDES_V53 } from './preludeDataV53';
import { canEnterLevel, normalizeGarage, type Garage } from './progression';
import type { GameState } from './simulation';
export type SortieSpec=typeof PRELUDES_V53[number];
export const SORTIES_V39:SortieSpec[]=PRELUDES_V53;
export const findSortieV39=(key:string)=>SORTIES_V39.find(s=>s.key===key);
export const nextPreludeV53=(garage:Garage,level:number)=>SORTIES_V39.find(s=>s.level===level&&!(garage.sortieClears??[]).includes(s.key));
export const canEnterSortieV39=(garage:Garage,key:string)=>{const spec=findSortieV39(key),base=normalizeGarage(garage);return !!spec&&base.tutorialCompleted&&canEnterLevel(base,spec.level)&&Array.from({length:spec.slot},(_,slot)=>spec.level+':'+slot).every(k=>(base.sortieClears??[]).includes(k));};
export const sortieCountV39=(s:GameState)=>s.kills;
export const sortieGoalV39=(s:SortieSpec)=>'击破敌机 '+s.target+' 台并抵达终点';
export const runProgressV39=(s:GameState)=>s.sortie?Math.max(0,Math.min(100,(s.progress-s.sortie.start)/(s.sortie.end-s.sortie.start)*100)):s.progress;
export function recordSortieV39(garage:Garage,s:GameState){const base=normalizeGarage(garage),spec=s.sortie&&findSortieV39(s.sortie.key);if(!spec||!canEnterSortieV39(base,spec.key)||s.status!=='result'||!s.won||s.bossDefeated||s.levelIndex!==spec.level||s.progress<spec.end||sortieCountV39(s)<spec.target||s.playerHp<=0||s.bots<=0)return base;return normalizeGarage({...base,sortieClears:[...(base.sortieClears??[]),spec.key]});}
export const gateVisibleV39=(s:GameState,mark:number|undefined)=>(s.status==='running'||s.status==='paused'&&s.resumeStatus==='running')&&!s.gateResolved&&mark!==undefined&&s.progress>=mark-12;
