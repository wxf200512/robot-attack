import type { CombatFeedback } from './experience';
import { readableFeedbackV42 } from './polishV42';
export function feedbackV60(feedback:CombatFeedback[],low:boolean,crowded:boolean){
 const chosen=readableFeedbackV42(feedback,low||crowded);
 if(!crowded)return chosen;
 const important=chosen.filter(f=>f.destroyed||f.armorBreak||f.coreStyle||f.pulseCore||f.kind==='elite'||f.kind==='boss');
 return important.length?important:chosen.slice(-1);
}
export const smoothPhaseV60=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
