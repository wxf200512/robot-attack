import { bladeStrikeV35 } from './bladeMotionV35';
import { motionPose, type MotionContext } from './animationTypes';
// A sword has wind-up, impact and follow-through, rather than gun recoil.
// Contact follows the captured melee flight (including the longer finisher).
export function bladeAnimation(c:MotionContext){
 if(c.arena&&c.s.dodgeTicks>0)return motionPose(c,3,Math.min(1,c.dodge*1.2)*8,'blade-slip');
 const burst=c.s.burstTicks>0,windup=burst?.8:1.7,hit=burst?Math.max(5,...c.s.pendingShots.filter(p=>p.attackStyle==='blade'&&p.burst).map(p=>p.duration)):Math.max(3,...c.s.pendingShots.filter(p=>p.attackStyle==='blade'&&!p.burst).map(p=>p.duration));
 if(c.armed&&c.remaining<=windup)return bladeStrikeV35(c,windup,hit);
 if(c.armed&&c.elapsed<hit+Math.min(1.6,Math.max(.3,c.interval-windup-hit)))return bladeStrikeV35(c,windup,hit);
 if(c.arena&&c.armed)return motionPose(c,1,0,'blade-guard');
 return c.arena?motionPose(c,1,(c.s.battleTime+c.t)/2.8%8,'blade-guard'):motionPose(c,0,(c.s.roadTicks+c.t+c.index*.8)/.35%16,'blade-run',0,16);
}
