import type { GameState } from './simulation';
import { BOSS_LOADOUTS } from './bossSkills';
// Increase repeated enemy pressure, retaining first-contact telegraphs and safe scheduling.
export const eliteRearmV43=(base:number)=>Math.max(36,Math.round(base*.8));
export const recoveryScaleV43=(stage:number,cycle:number)=>cycle===0?1:stage===2?.72:.82;
export function bossMoveV43(level:number,stage:number,cycle:number){
 const base=BOSS_LOADOUTS[level];
 // Stage two remixes each guardian's own mechanics, without borrowing another boss's skills.
 const orders=[[0,1,2,1,0,2],[0,1,2,1,0,2],[0,1,2,0,2,1],[0,1,2,1,0,2],[0,1,2,0,2,1]];
 const index=Math.max(0,cycle-1);
 return base[stage===2?orders[level][index%6]:index%base.length];
}
export const crowdV43=(s:GameState)=>s.enemyAttacks.length+s.threats.filter(t=>t.hp!==0).length>=5||s.pendingShots.length>=14||s.feedback.length>=5;
export const assetStageV43=(status:GameState['status'],progress:number,workshop:boolean,story:boolean)=>({
 home:status==='home',workshop:status==='home'&&workshop,story:story||status==='running',
 road:status==='running',combat:status==='running'||['boss-intro','battle','boss-shift'].includes(status),
 boss:status==='running'&&progress>=65||['boss-intro','battle','boss-shift','boss-victory'].includes(status),
 result:status==='result'||status==='battle',
});
