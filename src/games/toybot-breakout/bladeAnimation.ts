import { motionPose, type MotionContext } from './animationTypes';
// A sword has wind-up, impact and follow-through, rather than gun recoil.
// Contact follows the captured melee flight (including the longer finisher).
export function bladeAnimation(c:MotionContext){
 if(c.arena&&c.s.dodgeTicks>0)return motionPose(c,3,Math.min(1,c.dodge*1.2)*8,'blade-slip');
 const hit=c.s.burstTicks>0?1.4:Math.max(3,...c.s.pendingShots.filter(p=>p.attackStyle==='blade'&&!p.burst).map(p=>p.duration));
 if(c.armed&&c.remaining<=1.7)return motionPose(c,2,(1.7-c.remaining)/1.7*3,'blade-draw');
 if(c.armed&&c.elapsed<hit+1.8){const e=c.elapsed,frame=e<.7?2:e<hit*.67?3:e<hit?4:e<hit+.45?5:e<hit+1.15?6:7;return motionPose(c,2,frame,'blade-cut');}
 if(c.arena&&c.armed)return motionPose(c,1,0,'blade-guard');
 return c.arena?motionPose(c,1,(c.s.battleTime+c.t)/2.8%8,'blade-guard'):motionPose(c,0,(c.s.roadTicks+c.t+c.index*.8)/.35%16,'blade-run',0,16);
}
