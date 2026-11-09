import type { MotionContext } from './animationTypes';
import type { MechClass } from './mechs';
export const ARENA_ART_V36:Record<MechClass,string>={pulse:'/games/toybot-breakout/optimized/mech-pulse-arena-v36.png',heavy:'/games/toybot-breakout/optimized/mech-heavy-arena-v36.png',blade:'/games/toybot-breakout/optimized/mech-blade-arena-v36.png'};
export const EMPEROR_ART_V36='/games/toybot-breakout/optimized/boss-emperor-wide-v36.webp';
export function arenaPoseV36<T extends {sheet:string;row:number;frame:number;recoil:number;lean:number}>(c:MotionContext,p:T):Omit<T,'sheet'> & {sheet:T['sheet']|'arena'}{
 if(!c.arena||p.sheet==='blade')return p;
 const action=p.row%4===3?2:p.row%4===2?1:0;
 return {...p,sheet:'arena' as const,row:(c.tier?3:0)+action,frame:action===0?0:p.frame,recoil:c.reduced?0:Math.max(-1.2,Math.min(1.2,p.recoil)),lean:c.reduced?0:c.s.dodgeTicks>0?-c.s.dodgeDirection*Math.sin(c.dodge*Math.PI)*3:0};
}
