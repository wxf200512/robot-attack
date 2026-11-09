import { attackIntervalFor, DODGE_TICKS, isBossArena, type GameState, type PendingShot } from './simulation';
export const AWAKEN_ART={pulse:'/games/toybot-breakout/optimized/mech-pulse-awaken-v23.webp',heavy:'/games/toybot-breakout/optimized/mech-heavy-awaken-v23.webp',blade:'/games/toybot-breakout/optimized/mech-blade-awaken-v23.webp'};
export function awakeningPose(s:GameState,alpha:number,index:number){
 const t=Math.max(0,Math.min(1,alpha));
 if(!isBossArena(s))return {row:0,frame:Math.floor((s.roadTicks+t+index*1.3)/1.6)%4};
 if(s.dodgeTicks>0)return {row:3,frame:Math.min(3,Math.floor((1-(s.dodgeTicks-t)/DODGE_TICKS)*4))};
 const elapsed=attackIntervalFor(s)-s.fireCooldown+t;
 return elapsed>=0&&s.fireCooldown>attackIntervalFor(s)-4?{row:2,frame:Math.min(3,Math.floor(Math.max(0,elapsed)))}:{row:1,frame:Math.floor((s.battleTime+t)/3)%4};
}
export function coreVisualShots(shots:PendingShot[]){
 const seen=new Set<string>();
 return shots.filter(s=>{if(!s.burst||s.attackStyle!=='blade')return true;const key=[s.origins[0].index,s.lane,s.ticks,s.duration].join(':');if(seen.has(key))return false;seen.add(key);return true;});
}
