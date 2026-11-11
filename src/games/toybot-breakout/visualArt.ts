import { COMBAT_RUN_V56 } from './runArtV56';
import type { GameState } from './simulation';
export { motionTier } from './animationTypes';
export { sampleMechMotion as artPose } from './animationModules';
const ROOT='/games/toybot-breakout/optimized/';
export const RUN_ART=COMBAT_RUN_V56;
export const MOTION_ART={pulse:ROOT+'mech-pulse-motion-v30.webp',heavy:ROOT+'mech-heavy-motion-v30.webp',blade:ROOT+'mech-blade-motion-v30.webp'};
export const BOSS_EVOLUTION_ART=ROOT+'boss-evolution-v28.webp';
export const MATERIAL_ART=ROOT+'material-v28.webp';
export const PROP_ART=ROOT+'props-v28.webp';
export const PORTRAIT_ART=ROOT+'mech-portraits-v29.webp';
export function equipmentCell(kind:'pulse'|'heavy'|'blade',weapon:boolean,armor:boolean,core:boolean){return atlasCell(Number(weapon)+Number(armor)*2+Number(core)*4,{pulse:0,heavy:1,blade:2}[kind],8,3);}
export const atlasCell=(column:number,row:number,columns=8,rows=8)=>`${Math.max(0,Math.min(columns-1,column))*100/(columns-1)}% ${Math.max(0,Math.min(rows-1,row))*100/(rows-1)}%`;
export function bossArtFrame(s:GameState){
 const status=s.status==='paused'?s.resumeStatus:s.status;
 const phase2=s.bossStage===2||status==='boss-shift'&&s.bossPhaseTicks>=5;
 return (phase2?4:0)+(s.bossStep==='warning'?1:s.bossStep==='flight'||s.bossStep==='rush'?2:s.bossStep==='recovery'?3:0);
}
export function materialSample(kind:'hit'|'armor'|'heavy'|'elite'|'boss',ticks:number,alpha=0){
 const life=kind==='boss'?12:kind==='elite'?8:4,age=Math.max(0,Math.min(.999,1-(ticks-alpha)/life));
 return {row:kind==='armor'?2:kind==='boss'||kind==='elite'||kind==='heavy'?3:0,frame:Math.min(7,Math.floor(age*8)),age};
}
// Presentation only: pickups are a visual receipt of an already-resolved kill,
// not a second currency award or an extra collision/collection requirement.
export function salvageSample(x:number,y:number,ticks:number,laneX:number,alpha=0){
 const age=Math.max(0,Math.min(1,(7-ticks+alpha)/7)),p=Math.max(0,(age-.2)/.8),ease=p*p;
 return {x:x+(laneX-x)*ease,y:y+(59-y)*ease-Math.sin(age*Math.PI)*2,opacity:1-Math.max(0,(age-.8)/.2),scale:1-age*.55};
}
