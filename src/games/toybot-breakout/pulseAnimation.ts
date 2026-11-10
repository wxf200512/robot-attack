import { roadStrideFrameV50 } from './runStrideV50';
import { motionPose, type MotionContext } from './animationTypes';
// One-handed forward fire. The running clip is a continuous stabilized aim,
// so a 400ms firing cadence cannot reset or cross-fade the legs.
export function pulseAnimation(c:MotionContext){
 if(c.arena&&c.s.dodgeTicks>0)return motionPose(c,3,c.dodge*8,'pulse-side-step');
 if(!c.arena)return motionPose(c,0,roadStrideFrameV50(c),'pulse-run-aim',0,16);
 if(c.s.burstTicks>0&&c.armed)return motionPose(c,2,c.elapsed<.6?3:4,'pulse-channel',0);
 if(c.armed&&c.remaining<=.45)return motionPose(c,2,(.45-c.remaining)/.45*3,'pulse-trigger');
 if(c.armed&&c.elapsed<2.2)return motionPose(c,2,3+c.elapsed/2.2*5,'pulse-fire',Math.sin(Math.PI*c.elapsed/2.2)*.7);
 if(c.armed)return motionPose(c,1,0,'pulse-ready');
 return motionPose(c,1,(c.s.battleTime+c.t)/2.5%8,'pulse-ready');
}
