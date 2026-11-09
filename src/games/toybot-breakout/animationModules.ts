import type { GameState } from './simulation';
import { motionContext } from './animationTypes';
import { pulseAnimation } from './pulseAnimation';
import { heavyAnimation } from './heavyAnimation';
import { bladeAnimation } from './bladeAnimation';
export const MECH_ANIMATIONS={pulse:pulseAnimation,heavy:heavyAnimation,blade:bladeAnimation};
export const sampleMechMotion=(s:GameState,alpha=0,index=0,reduced=false)=>MECH_ANIMATIONS[s.mechClass](motionContext(s,alpha,index,reduced));
