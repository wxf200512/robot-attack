import type { GameState } from './simulation';
import type { CombatFeedback } from './experience';
import { dangerWindowsV42 } from './safetyV42';
import { getLevel } from './level';
import { enemyVisibleV41 } from './flowV41';
export type FinalPassV42={resumeTicks:number;baselineDamage:number;receipt:{ticks:number;sequence:number;damage:number;kills:number;utility:string;name:string}|null};
export const newFinalPassV42=():FinalPassV42=>({resumeTicks:0,baselineDamage:0,receipt:null});
export const strongFeedbackV42=(f:CombatFeedback)=>!!f.destroyed&&(f.kind==='elite'||f.kind==='boss');
export function readableFeedbackV42(feedback:CombatFeedback[],low:boolean){
 const rank=(f:CombatFeedback)=>(f.kind==='boss'?50:f.kind==='elite'?40:f.armorBreak?30:f.destroyed?20:f.kind==='heavy'?10:0);
 const groups=new Map<string,CombatFeedback>();for(const f of feedback){const key=Math.round(f.x/7)+':'+Math.round(f.y/5),old=groups.get(key);if(!old||rank(f)>rank(old)||rank(f)===rank(old)&&f.id>old.id)groups.set(key,f);}
 return [...groups.values()].sort((a,b)=>rank(b)-rank(a)||b.id-a.id).slice(0,low?2:4).sort((a,b)=>a.id-b.id);
}
export function skillOpportunityV42(s:GameState):string|null{
 if(!['running','battle'].includes(s.status)||s.playerHp<=0||s.bots<=0||s.burstEnergy<100||s.burstTicks>0||s.finish.resumeTicks>0)return null;
 if(s.mechClass==='pulse'){
  const shots=s.enemyAttacks.filter(a=>a.phase==='flight'&&['drone-burst','sniper-shot','bombard','hunter-fan','storm-orb','royal-salvo'].includes(a.kind)).length+s.threats.filter(t=>t.kind==='shell'&&t.hp!==0).length;
  return shots>=2?'可净化弹幕 ×'+shots:null;
 }
 if(s.mechClass==='heavy'){
  if(s.status==='battle'&&s.ops.parts.some(p=>p.kind==='shield'&&p.hp>0))return '护盾部件 · 双倍破拆';
  const targets=getLevel(s.levelIndex).hazards.filter((h,i)=>s.hazardHps[i]>0&&enemyVisibleV41(s,h)&&((h.armor??0)>0||s.enemyAttacks.some(a=>a.source==='hazard'&&a.sourceId===i&&a.phase==='warning')));
  return targets.length>=2?'可破甲压制 ×'+targets.length:null;
 }
 const incoming=dangerWindowsV42(s).some(w=>w.kind!=='body'&&w.from>0&&w.from<=8&&w.lane===s.lane&&!['field','lava','storm-orb','heat-mine'].includes(w.kind));
 return incoming?'攻击将至 · 起手格挡':null;
}
