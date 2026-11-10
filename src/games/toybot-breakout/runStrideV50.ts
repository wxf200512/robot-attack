import { roadStepFor, RUN_SPEED } from './simulation';
import type { MotionContext } from './animationTypes';
import type { MechClass } from './mechs';
import { RUN_FRAME_ORDER_V50, RUN_REGISTRATION_V50 } from './runRegistrationV50';

// Fixed distance per complete stride. Cadence follows the same progress as the floor.
export const STRIDE_TICKS_V50:Record<MechClass,number>={pulse:9.6,heavy:11.2,blade:8.8};
export function roadStrideFrameV50(c:MotionContext){
 const running=c.s.status==='running'||c.s.status==='paused'&&c.s.resumeStatus==='running';
 const distance=c.s.progress/RUN_SPEED+(running?c.t*roadStepFor(c.s,true)/RUN_SPEED:0);
 const phase=((distance/STRIDE_TICKS_V50[c.s.mechClass]+c.index*.173)%1+1)%1;
 return c.reduced?0:RUN_FRAME_ORDER_V50[c.s.mechClass][Math.min(15,Math.floor(phase*16))];
}
export function roadBodyRegistrationV50(kind:MechClass,tier:number,frame:number){
 const [x,y]=RUN_REGISTRATION_V50[kind][tier?1:0][Math.max(0,Math.min(15,Math.floor(frame)))];
 return {x:x*100/192,y:y*100/192};
}
