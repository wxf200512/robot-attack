import { roadStepFor, RUN_SPEED, type GameState } from './simulation';
import type { MotionContext } from './animationTypes';
import type { MechClass } from './mechs';
import { RUN_FRAME_ORDER_V50, RUN_REGISTRATION_V50 } from './runRegistrationV50';

// Fixed distance per complete stride. Cadence follows the same progress as the floor.
export const STRIDE_TICKS_V50:Record<MechClass,number>={pulse:9.6,heavy:11.2,blade:8.8};
export function roadStridePhaseV50(s:GameState,alpha=0,index=0){
 const running=s.status==='running'||s.status==='paused'&&s.resumeStatus==='running';
 const t=Math.max(0,Math.min(.999,Number.isFinite(alpha)?alpha:0));
 const distance=s.progress/RUN_SPEED+(running?t*roadStepFor(s,true)/RUN_SPEED:0);
 return ((distance/STRIDE_TICKS_V50[s.mechClass]+index*.173)%1+1)%1;
}
export function roadStrideFrameV50(c:MotionContext){
 const phase=roadStridePhaseV50(c.s,c.t,c.index);
 return c.reduced?0:RUN_FRAME_ORDER_V50[c.s.mechClass][Math.min(15,Math.floor(phase*16))];
}
export function roadWeightShiftV51(s:GameState,alpha=0,index=0,reduced=false){
 const running=s.status==='running'||s.status==='paused'&&s.resumeStatus==='running';
 if(reduced||!running)return {forward:0,pitch:0,contact:0,dustX:0};
 const phase=roadStridePhaseV50(s,alpha,index),step=phase*Math.PI*4;
 const amplitude={pulse:2.8,heavy:2,blade:3.2}[s.mechClass];
 const lift={pulse:.9,heavy:.6,blade:1}[s.mechClass];
 return {forward:-Math.sin(step)*amplitude-(1-Math.cos(step))*.5*lift,
  pitch:{pulse:3.5,heavy:2.6,blade:4}[s.mechClass]+Math.sin(step-Math.PI/4)*1.4,
  contact:Math.pow(Math.max(0,Math.cos(step)),6)*.28,dustX:phase<.5?-16:16};
}
export function roadBodyRegistrationV50(kind:MechClass,tier:number,frame:number){
 const [x,y]=RUN_REGISTRATION_V50[kind][tier?1:0][Math.max(0,Math.min(15,Math.floor(frame)))];
 return {x:x*100/192,y:y*100/192};
}
