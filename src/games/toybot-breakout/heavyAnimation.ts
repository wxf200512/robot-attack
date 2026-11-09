import { motionPose, type MotionContext } from './animationTypes';
// Cannon brace -> charge -> single discharge -> weighty recoil -> settle.
// This timing intentionally differs from the pulse gun and blade contact.
export function heavyAnimation(c:MotionContext){
 if(c.arena&&c.s.dodgeTicks>0){const ease=c.dodge*c.dodge*(3-2*c.dodge);return motionPose(c,3,ease*8,'heavy-weight-shift');}
 if(!c.arena)return motionPose(c,0,(c.s.roadTicks+c.t+c.index*.8)/.55%16,'heavy-run-brace',c.armed&&c.elapsed<2.8?Math.sin(Math.PI*c.elapsed/2.8)*1.4:0,16);
 if(c.armed&&c.remaining<=2)return motionPose(c,2,(2-c.remaining)/2*3,'heavy-charge');
 if(c.armed&&c.elapsed<5.2){const e=c.elapsed,frame=e<.5?3:e<1.6?4:e<2.8?5:e<4.2?6:7;return motionPose(c,2,frame,'heavy-cannon',Math.sin(Math.min(1,e/2.8)*Math.PI)*3.2);}
 if(c.armed)return motionPose(c,1,0,'heavy-brace');
 return motionPose(c,1,(c.s.battleTime+c.t)/4%8,'heavy-brace');
}
