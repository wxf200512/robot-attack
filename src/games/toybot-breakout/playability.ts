import { trialBonusV40 } from './tacticsV40';
import type { GameState } from './simulation';
import { rewardParts, UPGRADES, moduleLevel, upgradeCost, type Garage } from './progression';
import type { CombatFeedback } from './experience';
// Tuned for an ordinary three-unit W2 squad. Acquired power never changes HP.
export const BOSS_BASE_HEALTH=[2300,2600,2800,3000,3200] as const;
export const fixedBossHealth=(level:number,protocol:string)=>Math.round(BOSS_BASE_HEALTH[Math.max(0,Math.min(4,level))]*(protocol==='overdrive'?1.2:1));
export function visibleFeedback(feedback:CombatFeedback[],low:boolean){
 const rank={hit:0,armor:1,heavy:2,elite:3,boss:4};
 return [...feedback].sort((a,b)=>rank[b.kind]-rank[a.kind]||b.id-a.id).slice(0,low?2:4).sort((a,b)=>a.id-b.id);
}
export function rewardLedger(s:GameState){
 if(s.sortie){const salvage=Math.min(2,rewardParts(s.score,false)),victory=s.won?1:0,tactical=s.won&&s.sortie.firstClear?1:0;return {salvage,victory,tactical,protocol:0,trial:0,total:salvage+victory+tactical};}
 const salvage=rewardParts(s.score,false),victory=s.won?3:0,tactical=s.won?s.ops.bonusParts:0,protocol=s.won&&s.ops.protocol!=='standard'?3:0;
 const trial=trialBonusV40(s);
 return {salvage,victory,tactical,protocol,trial,total:salvage+victory+tactical+protocol+trial};
}
export function nextUpgrade(garage:Garage,s:GameState){
 const preference=s.report.collisions>s.report.hostile&&s.report.taken>25?'armor':s.mechClass==='heavy'?'core':'weapon';
 return UPGRADES.filter(u=>moduleLevel(garage,u.id)<u.costs.length).map(u=>({id:u.id,title:u.title,level:moduleLevel(garage,u.id)+1,cost:upgradeCost(garage,u.id),missing:Math.max(0,upgradeCost(garage,u.id)-garage.parts)})).sort((a,b)=>a.missing-b.missing||Number(b.id===preference)-Number(a.id===preference)||a.cost-b.cost)[0]??null;
}
