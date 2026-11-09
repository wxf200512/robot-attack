import type { BossPart } from './operations';
export const PART_DAMAGE_V38='/games/toybot-breakout/optimized/part-damage-v38.png';
export function partDamageV38(part:BossPart,clock:number,alpha:number,index:number,reduced=false){
 const age=clock-(part.brokenAt??-999)+Math.max(0,Math.min(.999,alpha));
 if(reduced||age>=12)return {row:2,frame:index%3,phase:'settled',opacity:.62};
 return age<4?{row:0,frame:Math.min(7,Math.floor(age*2)),phase:'sparks',opacity:.9}:{row:1,frame:Math.min(7,Math.floor(age-4)),phase:'smoke',opacity:Math.max(.25,.7-(age-4)*.05)};
}
