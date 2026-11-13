import { roadStepFor, RUN_SPEED, type GameState } from './simulation';
import type { MotionContext } from './animationTypes';
import type { MechClass } from './mechs';
import { RUN_REGISTRATION_V50 } from './runRegistrationV50';

// Fixed distance per complete stride. Cadence follows the same progress as the floor.
export const STRIDE_TICKS_V50:Record<MechClass,number>={pulse:8,heavy:9.6,blade:8};
export function roadStridePhaseV50(s:GameState,alpha=0,index=0){
 const running=s.status==='running'||s.status==='paused'&&s.resumeStatus==='running';
 const t=Math.max(0,Math.min(.999,Number.isFinite(alpha)?alpha:0));
 const distance=s.progress/RUN_SPEED+(running?t*roadStepFor(s,true)/RUN_SPEED:0);
 return ((distance/STRIDE_TICKS_V50[s.mechClass]+index*.173)%1+1)%1;
}
export function roadStrideFrameV50(c:MotionContext){
 const phase=roadStridePhaseV50(c.s,c.t,c.index);
 return c.reduced?0:Math.min(31,Math.floor(phase*32));
}
export function roadBodyRegistrationV50(kind:MechClass,tier:number,frame:number){
 const [x,y]=RUN_REGISTRATION_V50[kind][tier?1:0][Math.max(0,Math.min(15,Math.floor(frame)))];
 return {x:x*100/192,y:y*100/192};
}
