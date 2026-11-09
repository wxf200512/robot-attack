import type { GameState, EnemyAttack } from './simulation';
import { ELITE_ATTACKS, type ElitePattern } from './frontline';
import { getLevel, hazardLaneAt } from './level';
export type DangerWindowV42={lane:number;from:number;to:number;kind:string};
export const enemyFlightV42=(kind:EnemyAttack['kind'])=>ELITE_ATTACKS[kind as ElitePattern]?.flight??(kind==='bombard'?12:kind==='drone-burst'||kind==='pounce'||kind==='charge'?8:6);
export function dangerWindowsV42(s:GameState,extra:EnemyAttack[]=[],bossWindup=0):DangerWindowV42[]{
 const result:DangerWindowV42[]=[];
 const add=(lane:number,from:number,to=from,kind='hostile')=>{if(to>=0)result.push({lane,from:Math.max(0,from),to:Math.max(0,to),kind});};
 const attacks=[...s.enemyAttacks,...extra];
 for(const a of attacks){
  const profile=ELITE_ATTACKS[a.kind as ElitePattern];
  if(a.phase==='field'){add(a.lane,0,a.ticks,a.kind);continue;}
  const stun=a.source==='hazard'&&a.phase==='warning'?(s.roadImpacts[a.sourceId]?.stun??0):0;
  const eta=a.ticks+(a.phase==='warning'?enemyFlightV42(a.kind)+stun:0);
  if(profile?.field){add(a.lane,eta,eta+profile.field,a.kind);continue;}
  for(let shot=0;shot<Math.max(1,a.shotsRemaining);shot++)add(a.lane,eta+shot*6-1,eta+shot*6+1,a.kind);
 }
 for(const t of s.threats){
  if(t.hp===0||t.kind==='egg'||t.damage<=0||attacks.some(a=>a.source==='threat'&&a.sourceId===t.id))continue;
  if(t.kind==='field'){add(t.lane,0,t.ticks,t.kind);continue;}
  if(t.kind==='lava'){add(t.lane,t.ticks,t.ticks+(t.lingerTicks??0),t.kind);continue;}
  if(['minion','barrier','pylon','seal','orb','tether','wall'].includes(t.kind))continue; // Their actual strike must first obtain a warning slot.
  add(t.lane,t.ticks-1,t.ticks+1,t.kind);
 }
 if(s.status==='running')getLevel(s.levelIndex).hazards.forEach((h,i)=>{
  if(s.hazardHps[i]<=0||h.progress<s.progress||attacks.some(a=>a.source==='hazard'&&a.sourceId===i&&(a.kind==='charge'||a.kind==='pounce')))return;
  const eta=Math.ceil((h.progress-s.progress)/.08);if(eta<=60)add(hazardLaneAt(s.layoutIndex,i,h.progress,s.levelIndex),eta-1,eta+1,'body');
 });
 if(s.status==='battle'&&s.bossStep==='rush'&&!s.bossRushHit)s.bossAttackLanes.forEach(lane=>add(lane,10-s.bossStepTicks-1,10-s.bossStepTicks+1,'boss-rush'));
 if(s.status==='battle'&&s.bossStep==='warning'&&bossWindup>0){
  const kind=s.bossAttack,spawnOnly=['eggs','hive-link','pylons','lockdown','seals','swarm','bunker'].includes(kind);
  if(!spawnOnly){const delay=kind==='rush'||kind==='sweep'?10:kind==='vents'||kind==='smelt'||kind==='polarity'||kind==='judgement'||kind==='orbits'?1:kind==='mortar'?18:kind==='storm'?8:8;
   const hold=kind==='orbits'?48:kind==='smelt'?30:kind==='vents'?12:kind==='polarity'||kind==='judgement'?16:kind==='mortar'?18:1;
   s.bossAttackLanes.forEach(lane=>add(lane,bossWindup+delay-1,bossWindup+delay+hold,kind));
  }
 }
 return result;
}
// A short reaction budget plus the same four-tick, one-lane boss dodge used by combat.
// This is a scheduling guard, not auto-dodge, invulnerability, or removal of live attacks.
export function hasEscapeV42(s:GameState,windows:DangerWindowV42[],reaction=4,horizon=60):boolean{
 const duration=s.status==='running'?1:4,blocked=Array.from({length:horizon+1},(_,t)=>new Set(windows.filter(w=>w.from<=t&&w.to>=t).map(w=>w.lane)));
 type Pose={from:number;to:number;left:number};
 let poses:Pose[]=s.status==='battle'&&s.dodgeTicks>0?[{from:s.dodgeFromLane,to:s.lane,left:s.dodgeTicks}]:[{from:s.lane,to:s.lane,left:0}];
 const laneAt=(p:Pose)=>p.left>duration/2?p.from:p.to;
 for(let t=0;t<=horizon;t++){
  poses=poses.filter(p=>!blocked[t].has(laneAt(p)));if(!poses.length)return false;if(t===horizon)return true;
  const next=new Map<string,Pose>();
  for(const p of poses){const choices=p.left>0?[{...p,left:p.left-1}]:[{from:p.to,to:p.to,left:0},...(t>=reaction?[p.to-1,p.to+1].filter(lane=>lane>=0&&lane<=2).map(to=>({from:p.to,to,left:duration-1})):[])];
   for(const pose of choices)next.set(pose.from+':'+pose.to+':'+pose.left,pose);
  }
  poses=[...next.values()];
 }
 return true;
}
export const safeToQueueV42=(s:GameState,attacks:EnemyAttack[],bossWindup=0)=>hasEscapeV42(s,dangerWindowsV42(s,attacks,bossWindup));
