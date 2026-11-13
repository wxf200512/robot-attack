import { attackIntervalFor, effectiveWeapon, isBossArena, DODGE_TICKS, type GameState } from './simulation';
export type MotionContext={s:GameState;t:number;index:number;reduced:boolean;arena:boolean;tier:number;interval:number;elapsed:number;remaining:number;armed:boolean;dodge:number;lean:number};
export const motionTier=(weapon:number,armor:number,core:number)=>weapon>0||armor>0||core>0?4:0;
export function motionContext(s:GameState,alpha:number,index:number,reduced:boolean):MotionContext{
 const t=reduced?0:Math.max(0,Math.min(.999,alpha)),interval=attackIntervalFor(s);
 return {s,t,index,reduced,arena:isBossArena(s),tier:s.burstTicks>0?4:motionTier(effectiveWeapon(s),s.armorLevel,Math.max(s.coreLevel,s.garageCoreLevel)),interval,elapsed:interval-s.fireCooldown+t,remaining:Math.max(0,s.fireCooldown-t),armed:s.fireCooldown>0,dodge:Math.max(0,Math.min(1,1-(s.dodgeTicks-t)/DODGE_TICKS)),lean:reduced?0:s.ops.roadDodgeTicks>0?(s.lane-s.ops.roadFromLane)*Math.sin(Math.PI*(1-(s.ops.roadDodgeTicks-t)/3))*-7:0};
}
export function motionPose(c:MotionContext,row:number,frame:number,action:string,recoil=0,frames=8){return {row:c.tier+row,frame:c.reduced?0:Math.max(0,Math.min(frames-1,Math.floor(frame))),sheet:frames>=16?'run' as const:'motion' as const,classId:c.s.mechClass,action,lean:c.lean,recoil:c.reduced?0:recoil};}
