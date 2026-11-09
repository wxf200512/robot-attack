import type { GameState } from './simulation';
import { bossWarningTicks, isBossArena, BOSS_MOVE_TICKS, RUSH_CONTACT_TICK } from './simulation';
import { getLevel, type EnemyKind } from './level';
const ROOT='/games/toybot-breakout/optimized/';
export const BOSS_MOTION_V31=['furnace','queen','fortress','oracle','emperor'].map(k=>ROOT+'boss-'+k+'-motion-v31.webp');
export type HostileKind=EnemyKind|'minion'|'barrier';
export const ENEMY_MOTION_V31:Record<HostileKind,string>=Object.fromEntries(['drone','swarm','sniper','bomber','medic','minion','barrier'].map(k=>[k,ROOT+'enemy-'+k+'-motion-v31.png'])) as Record<HostileKind,string>;
type Profile={id:string;stride:number;attack:number;hover:number;lean:number;charge:(p:number)=>number};
const linear=(p:number)=>p,smooth=(p:number)=>p*p*(3-2*p);
export const BOSS_MOTION_PROFILES:readonly Profile[]=[
 {id:'furnace-stomp',stride:1.2,attack:7,hover:0,lean:1.5,charge:p=>p*p},
 {id:'queen-wing-burst',stride:.55,attack:5.5,hover:.9,lean:2,charge:smooth},
 {id:'fortress-shield-siege',stride:1.5,attack:8,hover:0,lean:1,charge:p=>Math.sqrt(p)},
 {id:'oracle-crystal-cast',stride:1,attack:8,hover:.65,lean:1.3,charge:linear},
 {id:'emperor-judgement',stride:1.3,attack:7,hover:0,lean:.8,charge:smooth},
];
export const ENEMY_MOTION_PROFILES:Record<HostileKind,Profile>={
 drone:{id:'patrol-rotor',stride:.75,attack:4.5,hover:.7,lean:2,charge:linear},
 swarm:{id:'bee-pounce',stride:.4,attack:4,hover:.9,lean:3,charge:p=>p*p},
 sniper:{id:'sniper-recoil',stride:1.35,attack:6,hover:.25,lean:1,charge:smooth},
 bomber:{id:'bomber-pods',stride:1.2,attack:7,hover:.55,lean:1.6,charge:p=>Math.sqrt(p)},
 medic:{id:'repair-claws',stride:.95,attack:6,hover:.35,lean:1.5,charge:smooth},
 minion:{id:'minion-biped-pounce',stride:.6,attack:5,hover:0,lean:2,charge:p=>p*p},
 barrier:{id:'barrier-ground-shock',stride:1.6,attack:6,hover:0,lean:.5,charge:smooth},
};
const clamp=(p:number)=>Math.max(0,Math.min(1,p));
export const hostileReactionKey=(target:string,index:number)=>target==='boss'?'boss:0':target+':'+index;
function reaction(s:GameState,key:string,t:number){const r=s.hostileReactions?.[key];return r&&r.ticks>0?{active:true,age:clamp((6-r.ticks+t)/6)}:{active:false,age:1};}
function pose(profile:Profile,row:number,frame:number,action:string,reduced:boolean,flash=0,lean=0,bob=0){return {profile:profile.id,row,frame:reduced?0:Math.min(7,Math.max(0,Math.floor(frame))),action,flash:reduced?0:flash,lean:reduced?0:lean,bob:reduced?0:bob};}
export function bossMotionV31(s:GameState,alpha=0,reduced=false){
 const t=reduced?0:clamp(alpha),p=BOSS_MOTION_PROFILES[s.levelIndex]??BOSS_MOTION_PROFILES[0],status=s.status==='paused'?s.resumeStatus:s.status;
 const phase2=s.bossStage===2&&!(status==='boss-shift'&&s.bossPhaseTicks<5),tier=phase2?4:0;
 const hit=reaction(s,'boss:0',t),flash=hit.active?Math.sin(hit.age*Math.PI)*.3:0,clock=s.battleTime+t;
 const out=(row:number,frame:number,action:string,lean=0,bob=0)=>pose(p,tier+row,frame,action,reduced,flash,lean,bob);
 if(status==='boss-victory')return out(3,Math.min(7,(s.bossPhaseTicks+t)/12*8),'destroyed',Math.min(12,(s.bossPhaseTicks+t)*.8),Math.min(10,(s.bossPhaseTicks+t)*.65));
 if(!isBossArena(s)||status==='boss-intro'||status==='boss-shift')return out(0,0,'ready');
 if(s.bossStep==='warning'){const progress=clamp((s.bossStepTicks+t)/bossWarningTicks(s));return out(1,p.charge(progress)*8,'charge');}
 if(s.bossStep==='rush'){
  const age=s.bossStepTicks+t;
  if(age<RUSH_CONTACT_TICK-2)return out(0,age/p.stride%8,'rush-move');
  return out(2,Math.min(7,(age-RUSH_CONTACT_TICK+2)*1.5),'rush-impact');
 }
 const fireAge=s.battleTime-s.bossFiredTick+t;
 if(s.bossStep==='flight'&&s.bossFiredTick>=0&&fireAge<p.attack)return out(2,fireAge/p.attack*8,'attack');
 // Telegraph and actual discharge always take precedence over hit flinches.
 if(hit.active)return out(3,hit.age*8,'hit');
 if(s.bossMoveTicks>0){const progress=clamp(1-(s.bossMoveTicks-t)/BOSS_MOVE_TICKS);return out(0,progress*8,'relocate',Math.sin(progress*Math.PI)*p.lean);}
 // Idle is a parked pose for grounded bosses; flying units retain their own hover.
 return out(0,p.hover>0?clock/p.stride%8:0,'ready',0,Math.sin(clock*.55)*p.hover);
}
export function enemyMotionV31(s:GameState,index:number,alpha=0,reduced=false,source:'hazard'|'threat'='hazard'){
 const t=reduced?0:clamp(alpha),h=source==='hazard'?getLevel(s.levelIndex).hazards[index]:undefined;
 const kind:HostileKind=source==='threat'?(s.threats.find(a=>a.id===index)?.kind==='barrier'?'barrier':'minion'):h?.kind??'drone',p=ENEMY_MOTION_PROFILES[kind];
 const clock=(source==='hazard'?s.roadTicks:s.battleTime)+t,hit=reaction(s,hostileReactionKey(source,index),t),flash=hit.active?Math.sin(hit.age*Math.PI)*.35:0;
 const out=(row:number,frame:number,action:string)=>({...pose(p,row,frame,action,reduced,flash,0,row===0?Math.sin((clock+index*.8)*.65)*p.hover:0),kind});
 const attacks=s.enemyAttacks.filter(a=>a.source===source&&a.sourceId===index),a=attacks.find(a=>a.phase==='flight')??attacks.find(a=>a.phase==='warning');
 if(a?.phase==='warning')return out(1,p.charge(clamp(1-(a.ticks-t)/Math.max(1,a.duration)))*8,'charge');
 if(a?.phase==='flight'&&a.duration-a.ticks+t<p.attack)return out(2,(a.duration-a.ticks+t)/p.attack*8,'attack');
 if(kind==='medic'&&source==='hazard'){
  const repair=s.hostileReactions?.['repair:'+index];
  if(repair&&repair.ticks>0)return out(2,(6-repair.ticks+t)/6*8,'repair-pulse');
 }
 if(hit.active)return out(3,hit.age*8,'hit');
 if(kind==='barrier'){const threat=s.threats.find(a=>a.id===index);return out(0,Math.min(7,((threat?.duration??0)-(threat?.ticks??0)+t)/1.2),'move');}
 return out(0,(clock+index*.8)/p.stride%8,'move');
}
