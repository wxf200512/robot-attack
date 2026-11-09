import type { Garage } from './progression';
import type { GameState } from './simulation';
import type { MechClass } from './mechs';
export type GradeV44='C'|'B'|'A'|'S';
export type CoatingV44='stock'|'amber'|'prism';
export const GRADE_RANK_V44:Record<GradeV44,number>={C:1,B:2,A:3,S:4};
export function gradeV44(s:GameState):GradeV44|null{
 if(s.status!=='result'||!s.won||s.sortie||!s.bossDefeated||s.progress!==100||s.playerHp<=0||s.bots<=0)return null;
 const points=Number(s.playerHp/s.playerMaxHp>=.65)+Number(s.tactics.elapsed<=3000)+Number(s.tactics.collisions<=2);
 return (['C','B','A','S'] as const)[points];
}
export function normalizeMasteryV44(value:unknown,cleared:boolean[]):Record<string,GradeV44>{
 if(!value||typeof value!=='object')return {};
 return Object.fromEntries(Object.entries(value).filter(([key,grade])=>/^[0-4]:(pulse|heavy|blade)$/.test(key)&&cleared[Number(key[0])]&&typeof grade==='string'&&Object.prototype.hasOwnProperty.call(GRADE_RANK_V44,grade))) as Record<string,GradeV44>;
}
export function coatingUnlockedV44(mastery:Record<string,GradeV44>,coating:unknown):coating is CoatingV44{
 const keys=Object.keys(mastery).filter(k=>GRADE_RANK_V44[mastery[k]]>=3);
 return coating==='stock'||coating==='amber'&&keys.length>=1||coating==='prism'&&new Set(keys.map(k=>k.split(':')[1])).size===3;
}
export const COATINGS_V44=[{id:'stock',name:'原厂蓝',goal:'初始配色'},{id:'amber',name:'琥珀先锋',goal:'任一主线达到A级'},{id:'prism',name:'星辉紫',goal:'三机型分别获得A级'}] as const;
export const masteryKeyV44=(level:number,mech:MechClass)=>level+':'+mech;
export const keepBestV44=(old:GradeV44|undefined,next:GradeV44)=>old&&GRADE_RANK_V44[old]>=GRADE_RANK_V44[next]?old:next;

export function recordMasteryV44(g:Garage,s:GameState):Garage{
 const grade=gradeV44(s);if(!grade||!Number.isInteger(s.levelIndex)||s.levelIndex<0||s.levelIndex>4||!g.completedLevels[s.levelIndex])return g;
 const mastery=normalizeMasteryV44(g.mastery,g.completedLevels),key=masteryKeyV44(s.levelIndex,s.mechClass);
 return {...g,mastery:{...mastery,[key]:keepBestV44(mastery[key],grade)}};
}
