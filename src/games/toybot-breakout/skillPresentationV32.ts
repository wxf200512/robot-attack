import { BURST_TICKS, canShoot, type GameState } from './simulation';
export function skillReadout(s:GameState){
 const active=s.burstTicks>0&&canShoot(s.status==='paused'?s.resumeStatus??'home':s.status),start=s.burstStart;
 return {active,remaining:Math.max(0,s.burstTicks)/10,fill:Math.max(0,Math.min(1,s.burstTicks/BURST_TICKS)),damage:start?Math.max(0,Math.round(s.report.dealt-start.damage)):0,kills:start?Math.max(0,s.kills-start.kills):0};
}
// Presentation only: nearby blasts merge into one local receipt, never extra light
// or a second damage event. The authoritative effect records stay untouched.
export function readableCoreImpacts(effects:GameState['coreDetonations']){
 const groups=new Map<string,GameState['coreDetonations'][number]>();
 for(const effect of effects){const key=[effect.kind??'blast',Math.round(effect.x/8),Math.round(effect.y/6)].join(':');const old=groups.get(key);if(!old||effect.ticks>=old.ticks)groups.set(key,effect);}
 return [...groups.values()].slice(-3);
}
