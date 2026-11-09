import { canEnterLevel, normalizeGarage, type Garage } from './progression';
import type { GameState } from './simulation';
export type SortieSpec={key:string;level:number;slot:0|1;name:string;start:number;end:number;target:number;goal:'kills'|'elites'};
const names=[['灯芯运输线','熔炉守门阵'],['猎蜂拦截','蜂巢护航阵'],['盾卫清障','重装督军阵'],['电涌前哨','极性执法阵'],['近卫清场','裁决封锁阵']];
export const SORTIES_V39:SortieSpec[]=names.flatMap((pair,level)=>pair.map((name,slot)=>({key:level+':'+slot,level,slot:slot as 0|1,name,start:slot?43:12,end:slot?88:43,target:slot?1:[8,12,10,12,14][level],goal:slot?'elites':'kills'})));
export const findSortieV39=(key:string)=>SORTIES_V39.find(s=>s.key===key);
export const canEnterSortieV39=(garage:Garage,key:string)=>{const spec=findSortieV39(key);return !!spec&&garage.tutorialCompleted&&canEnterLevel(garage,spec.level)&&(spec.slot===0||(garage.sortieClears??[]).includes(spec.level+':0'));};
export const sortieCountV39=(s:GameState)=>s.sortie?.goal==='elites'?s.report.elites:s.kills;
export const sortieGoalV39=(s:SortieSpec)=>(s.goal==='elites'?'击破精英 ':'击破敌机 ')+s.target+(s.goal==='elites'?' 名':' 台');
export const runProgressV39=(s:GameState)=>s.sortie?Math.max(0,Math.min(100,(s.progress-s.sortie.start)/(s.sortie.end-s.sortie.start)*100)):s.progress;
export function recordSortieV39(garage:Garage,s:GameState){const base=normalizeGarage(garage),spec=s.sortie&&findSortieV39(s.sortie.key);if(!spec||!canEnterSortieV39(base,spec.key)||s.status!=='result'||!s.won||s.bossDefeated||s.levelIndex!==spec.level||s.progress<spec.end||sortieCountV39(s)<spec.target||s.playerHp<=0)return base;return normalizeGarage({...base,sortieClears:[...(base.sortieClears??[]),spec.key]});}
export const gateVisibleV39=(s:GameState,mark:number|undefined)=>(s.status==='running'||s.status==='paused'&&s.resumeStatus==='running')&&!s.gateResolved&&mark!==undefined&&s.progress>=mark-12;
