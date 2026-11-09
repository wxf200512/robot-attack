import { arenaPoseV36 } from './arenaMotionV36';
import type { GameState } from './simulation';
import { motionContext } from './animationTypes';
import { pulseAnimation } from './pulseAnimation';
import { heavyAnimation } from './heavyAnimation';
import { bladeAnimation } from './bladeAnimation';
export const MECH_ANIMATIONS={pulse:pulseAnimation,heavy:heavyAnimation,blade:bladeAnimation};
export const sampleMechMotion=(s:GameState,alpha=0,index=0,reduced=false)=>{const c=motionContext(s,alpha,index,reduced);return arenaPoseV36(c,MECH_ANIMATIONS[s.mechClass](c));};
