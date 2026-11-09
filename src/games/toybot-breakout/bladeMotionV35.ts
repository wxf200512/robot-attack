import { motionPose, type MotionContext } from './animationTypes';
export const BLADE_ATTACK_V35='/games/toybot-breakout/optimized/mech-blade-attack-v35.webp';
// One wind-up -> contact -> follow-through clip, sampled against the real volley.
// No crossfade: exactly one opaque body is rendered at every point in the cycle.
export function bladeStrikeV35(c:MotionContext,windup:number,contact:number){
 const before=c.remaining<=windup;
 const recovery=Math.max(.3,Math.min(1.6,c.interval-windup-contact));
 const phase=before?(windup-c.remaining)/windup*4:c.elapsed<=contact?4+c.elapsed/contact*4:8+Math.min(1,(c.elapsed-contact)/recovery)*8;
 const frame=c.reduced?0:Math.max(0,Math.min(15,Math.floor(phase)));
 const base=motionPose(c,2,0,before?'blade-draw':'blade-cut');
 return {...base,sheet:'blade' as const,row:(c.tier?2:0)+Math.floor(frame/8),frame:frame%8,clipFrame:frame,recoil:c.reduced?0:-Math.sin(Math.PI*Math.min(1,phase/15))*1.4};
}
